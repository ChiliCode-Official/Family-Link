import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { auth, db } from '../services/firebase';
import { collection, doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { safeStorage } from '../services/storage';
import '../styles/find-my.css';

// Fix Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to handle map centering & layout recalculation on mobile/resizing
function ChangeMapView({ center, zoom, triggerRecalc }) {
  const map = useMap();
  
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [map, triggerRecalc]);

  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, zoom || 15, { duration: 1.5 });
    }
  }, [center, zoom, map]);
  return null;
}

// Controller for custom zoom & center buttons
function MapControls({ onZoomIn, onZoomOut, onLocateMe }) {
  return (
    <div className="map-floating-tools">
      <button className="map-circle-btn" onClick={onZoomIn} title="Acercar">
        ➕
      </button>
      <button className="map-circle-btn" onClick={onZoomOut} title="Alejar">
        ➖
      </button>
      <button className="map-circle-btn" onClick={onLocateMe} title="Centrar en mi ubicación">
        🎯
      </button>
    </div>
  );
}

// Function to create a rich custom avatar marker matching the modern UI
const createAvatarIcon = (member, isSelected) => {
  const initials = member.name ? member.name.substring(0, 2).toUpperCase() : '👤';
  const hasPhoto = member.photoURL;
  const pinColor = isSelected ? '#4ade80' : (member.color || '#1c3829');

  const avatarHtml = `
    <div class="find-my-avatar-marker">
      <div class="find-my-pulse" style="background: ${pinColor}55;"></div>
      <div class="find-my-avatar-pin" style="
        border-color: ${isSelected ? '#4ade80' : '#ffffff'};
        background-color: ${pinColor};
        ${hasPhoto ? `background-image: url('${member.photoURL}');` : ''}
      ">
        ${!hasPhoto ? initials : ''}
      </div>
      <div style="
        margin-top: 5px;
        background: #142a1e;
        color: #ffffff;
        font-size: 11px;
        font-weight: 700;
        padding: 3px 10px;
        border-radius: 12px;
        white-space: nowrap;
        border: 1px solid rgba(74, 222, 128, 0.4);
        box-shadow: 0 4px 10px rgba(0,0,0,0.3);
      ">
        ${member.name || 'Miembro'}
      </div>
    </div>
  `;

  return L.divIcon({
    html: avatarHtml,
    className: 'custom-avatar-pin-container',
    iconSize: [60, 75],
    iconAnchor: [30, 45],
    popupAnchor: [0, -45]
  });
};

function FindMy() {
  const mapRef = useRef(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [nickname, setNickname] = useState(safeStorage.get('familyNickname', ''));
  const [locations, setLocations] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [isSharing, setIsSharing] = useState(safeStorage.get('familyShareLocation', 'true') === 'true');
  const [watchId, setWatchId] = useState(null);
  const [batteryLevel, setBatteryLevel] = useState(null);
  const [geoError, setGeoError] = useState(null);

  // Modern UI modes: 'map' or 'list'
  const [viewMode, setViewMode] = useState('map'); // 'map' | 'list'
  const [filterCategory, setFilterCategory] = useState('todos'); // 'todos' | 'movimiento' | 'bateria'

  const defaultCenter = [19.4326, -99.1332]; // Ciudad de México
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [mapZoom, setMapZoom] = useState(13);

  // Monitor Battery Status if supported
  useEffect(() => {
    if ('getBattery' in navigator) {
      navigator.getBattery().then(battery => {
        setBatteryLevel(Math.round(battery.level * 100));
        battery.addEventListener('levelchange', () => {
          setBatteryLevel(Math.round(battery.level * 100));
        });
      }).catch(() => {});
    }
  }, []);

  // Auth & Nickname
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsub();
  }, []);

  // Clave única consistente: el nombre en minúsculas si existe, o el uid de Google
  const effectiveUserId = (currentUser?.uid || (nickname ? nickname.toLowerCase() : '') || 'yo').trim();

  // Firestore Sync: Listen to all family members' locations & deduplicate
  useEffect(() => {
    const locRef = collection(db, 'locations');
    const unsub = onSnapshot(locRef, (snapshot) => {
      const mapByName = new Map();

      snapshot.docs.forEach(d => {
        const data = d.data();
        const memberKey = (data.name ? data.name.trim().toLowerCase() : d.id);
        
        if (!mapByName.has(memberKey) || (data.lastSeen && data.lastSeen > (mapByName.get(memberKey).lastSeen || 0))) {
          mapByName.set(memberKey, {
            id: d.id,
            ...data
          });
        }
      });

      const docs = Array.from(mapByName.values());
      setLocations(docs);

      if (docs.length > 0 && !selectedMember) {
        const myDoc = docs.find(d => d.id === effectiveUserId || (d.name && d.name.toLowerCase() === (nickname || '').toLowerCase()));
        if (myDoc && myDoc.latitude) {
          setMapCenter([myDoc.latitude, myDoc.longitude]);
        } else if (docs[0].latitude) {
          setMapCenter([docs[0].latitude, docs[0].longitude]);
        }
      }
    });

    return () => unsub();
  }, [currentUser, nickname, selectedMember, effectiveUserId]);

  // Handle Location Tracking & Upload to Firestore
  useEffect(() => {
    const myName = nickname || currentUser?.displayName?.split(' ')[0] || 'Yo';
    const myPhoto = currentUser?.photoURL || '';

    if (isSharing && navigator.geolocation) {
      const id = navigator.geolocation.watchPosition(
        async (pos) => {
          setGeoError(null);
          const { latitude, longitude, speed, heading, accuracy } = pos.coords;
          
          try {
            await setDoc(doc(db, 'locations', effectiveUserId), {
              name: myName,
              userId: currentUser?.uid || '',
              photoURL: myPhoto,
              latitude,
              longitude,
              accuracy: Math.round(accuracy || 0),
              speed: speed ? Math.round(speed * 3.6) : 0, // km/h
              heading: heading || 0,
              battery: batteryLevel,
              updatedAt: serverTimestamp(),
              lastSeen: Date.now()
            }, { merge: true });
          } catch (err) {
            console.error("Error al actualizar ubicación en Firestore:", err);
          }
        },
        (error) => {
          console.warn("Error de geolocalización:", error.message);
          if (error.code === 1) {
            setGeoError("Permiso de ubicación bloqueado. Actívalo en la barra de direcciones de tu navegador.");
          }
        },
        { enableHighAccuracy: true, maximumAge: 30000, timeout: 20000 }
      );
      setWatchId(id);
    } else if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [isSharing, currentUser, nickname, batteryLevel, effectiveUserId]);

  const toggleSharing = () => {
    const nextVal = !isSharing;
    setIsSharing(nextVal);
    safeStorage.set('familyShareLocation', String(nextVal));
  };

  const handleSelectMember = (member) => {
    setSelectedMember(member);
    if (member.latitude && member.longitude) {
      setMapCenter([member.latitude, member.longitude]);
      setMapZoom(16);
      setViewMode('map');
    }
  };

  const handleLocateMe = () => {
    const myDoc = locations.find(d => d.id === effectiveUserId || (d.name && d.name.toLowerCase() === (nickname || '').toLowerCase()));
    if (myDoc && myDoc.latitude) {
      setMapCenter([myDoc.latitude, myDoc.longitude]);
      setMapZoom(16);
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        setMapCenter([pos.coords.latitude, pos.coords.longitude]);
        setMapZoom(16);
      });
    }
  };

  // Filtered members by chip
  const filteredMembers = locations.filter(member => {
    if (filterCategory === 'movimiento') return (member.speed || 0) > 3;
    if (filterCategory === 'bateria') return member.battery !== undefined && member.battery !== null && member.battery < 25;
    return true;
  });

  const formatLastSeen = (timestamp) => {
    if (!timestamp) return 'Desconocido';
    const diff = Math.floor((Date.now() - timestamp) / 1000);
    if (diff < 60) return 'Ahora mismo';
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
    return 'Hace días';
  };

  return (
    <div className="find-my-container">
      {/* Top Floating Bar (Segmented Switch & Search Circle) */}
      <div className="map-top-bar">
        <div className="map-view-switcher">
          <button 
            className={`map-switch-btn ${viewMode === 'map' ? 'active' : ''}`}
            onClick={() => setViewMode('map')}
          >
            🗺️ Mapa
          </button>
          <button 
            className={`map-switch-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            📋 Lista ({locations.length})
          </button>
        </div>

        <button 
          className="map-circle-btn" 
          onClick={handleLocateMe}
          title="Mi Ubicación"
        >
          🔍
        </button>
      </div>

      {/* Horizontal Filter Chips */}
      <div className="map-filter-chips">
        <button 
          className={`map-chip ${filterCategory === 'todos' ? 'active' : ''}`}
          onClick={() => setFilterCategory('todos')}
        >
          👥 Todos ({locations.length})
        </button>
        <button 
          className={`map-chip ${filterCategory === 'movimiento' ? 'active' : ''}`}
          onClick={() => setFilterCategory('movimiento')}
        >
          🚗 En Movimiento
        </button>
        <button 
          className={`map-chip ${filterCategory === 'bateria' ? 'active' : ''}`}
          onClick={() => setFilterCategory('bateria')}
        >
          🪫 Batería Baja
        </button>
      </div>

      {/* Floating Right Map Controls (Zoom & Location) */}
      {viewMode === 'map' && (
        <MapControls 
          onZoomIn={() => setMapZoom(z => Math.min(z + 1, 18))}
          onZoomOut={() => setMapZoom(z => Math.max(z - 1, 3))}
          onLocateMe={handleLocateMe}
        />
      )}

      {/* Sidebar / Fullscreen List on mobile */}
      <div className={`find-my-sidebar ${viewMode === 'list' ? 'mobile-full' : ''}`} style={{
        display: (viewMode === 'list' || window.innerWidth > 768) ? 'flex' : 'none'
      }}>
        {/* Header */}
        <div style={{ padding: '80px 24px 16px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#ffffff' }}>
              📍 Familia
            </h1>
            <span style={{ fontSize: '13px', background: 'rgba(74, 222, 128, 0.15)', color: '#4ade80', padding: '4px 10px', borderRadius: '14px', fontWeight: '600' }}>
              {locations.length} en línea
            </span>
          </div>

          {/* Privacy & Sharing Toggle */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginTop: '16px', 
            padding: '12px 16px', 
            backgroundColor: '#142a1e', 
            borderRadius: '18px',
            border: '1px solid rgba(74, 222, 128, 0.2)'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#ffffff' }}>
                Compartir mi ubicación
              </span>
              <span style={{ fontSize: '11px', color: '#a3c4b0' }}>
                {isSharing ? 'Visible para la familia' : 'Ubicación pausada'}
              </span>
            </div>

            <label style={{ position: 'relative', display: 'inline-block', width: '46px', height: '26px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={isSharing} 
                onChange={toggleSharing} 
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: isSharing ? '#4ade80' : '#2e4a3b',
                borderRadius: '34px',
                transition: '0.3s'
              }}>
                <span style={{
                  position: 'absolute',
                  content: '""',
                  height: '20px',
                  width: '20px',
                  left: isSharing ? '23px' : '3px',
                  bottom: '3px',
                  backgroundColor: '#ffffff',
                  borderRadius: '50%',
                  transition: '0.3s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}></span>
              </span>
            </label>
          </div>

          {geoError && (
            <div style={{ marginTop: '10px', fontSize: '12px', color: '#ff5252', backgroundColor: 'rgba(255,82,82,0.1)', padding: '8px 12px', borderRadius: '10px' }}>
              ⚠️ {geoError}
            </div>
          )}
        </div>

        {/* Members List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filteredMembers.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: '#a3c4b0', fontSize: '14px' }}>
              📡 Esperando señales de ubicación de la familia...
            </div>
          )}

          {filteredMembers.map((member) => {
            const isSelected = selectedMember?.id === member.id;
            return (
              <div 
                key={member.id}
                className={`find-my-member-card ${isSelected ? 'selected' : ''}`}
                onClick={() => handleSelectMember(member)}
              >
                {/* Avatar */}
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: '#1c3829',
                  backgroundImage: member.photoURL ? `url(${member.photoURL})` : 'none',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '18px',
                  color: '#fff',
                  flexShrink: 0,
                  border: '2px solid rgba(74, 222, 128, 0.4)',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
                }}>
                  {!member.photoURL && (member.name ? member.name.substring(0, 2).toUpperCase() : '👤')}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '700', fontSize: '15px', color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {member.name} {member.id === effectiveUserId ? '(Tú)' : ''}
                    </span>
                    {member.battery !== undefined && member.battery !== null && (
                      <span style={{ fontSize: '12px', color: member.battery < 20 ? '#ff5252' : '#4ade80', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
                        🔋 {member.battery}%
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#a3c4b0' }}>
                    <span>
                      {member.speed > 3 ? `🚗 ${member.speed} km/h` : '📍 En posición'}
                    </span>
                    <span>{formatLastSeen(member.lastSeen)}</span>
                  </div>

                  {/* Botón Cómo llegar */}
                  {member.latitude && member.longitude && (
                    <div style={{ marginTop: '4px' }}>
                      <button 
                        className="directions-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          const url = `https://www.google.com/maps/dir/?api=1&destination=${member.latitude},${member.longitude}`;
                          window.open(url, '_blank');
                        }}
                      >
                        <div className="directions-pin-loader"></div>
                        <span>Cómo llegar</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Map Wrap */}
      <div className="find-my-map-wrap">
        <MapContainer 
          center={mapCenter} 
          zoom={mapZoom} 
          style={{ width: '100%', height: '100%' }}
          zoomControl={false}
        >
          <ChangeMapView center={mapCenter} zoom={mapZoom} triggerRecalc={viewMode} />
          
          {/* Free OpenStreetMap Standard Tiles */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {locations.map((member) => {
            if (!member.latitude || !member.longitude) return null;
            const isSelected = selectedMember?.id === member.id;

            return (
              <Marker
                key={member.id}
                position={[member.latitude, member.longitude]}
                icon={createAvatarIcon(member, isSelected)}
                eventHandlers={{
                  click: () => handleSelectMember(member)
                }}
              >
                <Popup>
                  <div style={{ textAlign: 'center', padding: '6px' }}>
                    <strong style={{ fontSize: '15px', color: '#1c3829' }}>{member.name}</strong>
                    <div style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>
                      Última señal: {formatLastSeen(member.lastSeen)}
                    </div>
                    {member.speed > 0 && (
                      <div style={{ fontSize: '12px', color: '#1c3829', marginTop: '2px', fontWeight: '600' }}>
                        Velocidad: {member.speed} km/h
                      </div>
                    )}
                    <div style={{ marginTop: '8px' }}>
                      <button 
                        className="directions-btn"
                        style={{ fontSize: '12px', padding: '6px 12px', width: '100%', justifyContent: 'center' }}
                        onClick={() => {
                          const url = `https://www.google.com/maps/dir/?api=1&destination=${member.latitude},${member.longitude}`;
                          window.open(url, '_blank');
                        }}
                      >
                        <div className="directions-pin-loader" style={{ width: '16px', height: '16px' }}></div>
                        <span>Iniciar Ruta</span>
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {/* Floating Bottom Dock (Forest Theme) */}
      <div className="map-bottom-dock">
        <button 
          className={`map-dock-item ${viewMode === 'map' ? 'active' : ''}`}
          onClick={() => setViewMode('map')}
          title="Mapa"
        >
          🌲
        </button>
        <button 
          className={`map-dock-item ${viewMode === 'list' ? 'active' : ''}`}
          onClick={() => setViewMode('list')}
          title="Lista de Personas"
        >
          📍
        </button>
        <button 
          className="map-dock-item"
          onClick={handleLocateMe}
          title="Centrar"
        >
          🎯
        </button>
        <div 
          className="map-dock-avatar"
          style={{ backgroundImage: currentUser?.photoURL ? `url(${currentUser.photoURL})` : 'none' }}
          title={nickname || 'Tú'}
        >
          {!currentUser?.photoURL && (nickname ? nickname.substring(0, 2).toUpperCase() : 'YO')}
        </div>
      </div>
    </div>
  );
}

export default FindMy;
