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

// Component to handle map centering programmatically
function ChangeMapView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, zoom || 15, { duration: 1.5 });
    }
  }, [center, zoom, map]);
  return null;
}

// Function to create a rich custom Apple-like avatar marker
const createAvatarIcon = (member, isSelected) => {
  const initials = member.name ? member.name.substring(0, 2).toUpperCase() : '👤';
  const hasPhoto = member.photoURL;
  const pinColor = isSelected ? '#ff5722' : (member.color || '#007aff');

  const avatarHtml = `
    <div class="find-my-avatar-marker">
      <div class="find-my-pulse" style="background: ${pinColor}55;"></div>
      <div class="find-my-avatar-pin" style="
        border-color: ${isSelected ? '#ff5722' : '#ffffff'};
        background-color: ${pinColor};
        ${hasPhoto ? `background-image: url('${member.photoURL}');` : ''}
      ">
        ${!hasPhoto ? initials : ''}
      </div>
      <div style="
        margin-top: 4px;
        background: rgba(0,0,0,0.75);
        color: #ffffff;
        font-size: 11px;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 10px;
        white-space: nowrap;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      ">
        ${member.name || 'Miembro'}
      </div>
    </div>
  `;

  return L.divIcon({
    html: avatarHtml,
    className: 'custom-avatar-pin-container',
    iconSize: [60, 70],
    iconAnchor: [30, 45],
    popupAnchor: [0, -45]
  });
};

function FindMy() {
  const [currentUser, setCurrentUser] = useState(null);
  const [nickname, setNickname] = useState(safeStorage.get('familyNickname', ''));
  const [locations, setLocations] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [isSharing, setIsSharing] = useState(safeStorage.get('familyShareLocation', 'true') === 'true');
  const [watchId, setWatchId] = useState(null);
  const [batteryLevel, setBatteryLevel] = useState(null);
  const [geoError, setGeoError] = useState(null);

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

  // Firestore Sync: Listen to all family members' locations
  useEffect(() => {
    const locRef = collection(db, 'locations');
    const unsub = onSnapshot(locRef, (snapshot) => {
      const docs = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      setLocations(docs);

      // If we have locations and no member selected, center on first or active user
      if (docs.length > 0 && !selectedMember) {
        const myDoc = docs.find(d => d.id === (currentUser?.uid || nickname));
        if (myDoc && myDoc.latitude) {
          setMapCenter([myDoc.latitude, myDoc.longitude]);
        } else if (docs[0].latitude) {
          setMapCenter([docs[0].latitude, docs[0].longitude]);
        }
      }
    });

    return () => unsub();
  }, [currentUser, nickname, selectedMember]);

  // Handle Location Tracking & Upload to Firestore
  useEffect(() => {
    const myId = currentUser?.uid || nickname || 'invitado_' + Math.random().toString(36).substring(7);
    const myName = nickname || currentUser?.displayName?.split(' ')[0] || 'Yo';
    const myPhoto = currentUser?.photoURL || '';

    if (isSharing && navigator.geolocation) {
      const id = navigator.geolocation.watchPosition(
        async (pos) => {
          setGeoError(null);
          const { latitude, longitude, speed, heading, accuracy } = pos.coords;
          
          try {
            await setDoc(doc(db, 'locations', myId), {
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
          setGeoError("Permite el acceso a la ubicación en tu navegador para compartir tu posición.");
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
      );
      setWatchId(id);
    } else if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [isSharing, currentUser, nickname, batteryLevel]);

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
    }
  };

  // Helper to format last seen
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
      {/* Sidebar List (Apple Find My style) */}
      <div className="find-my-sidebar">
        {/* Header */}
        <div style={{ padding: '20px 24px 16px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: 'var(--theme-text, #ffffff)' }}>
              📍 Encontrar
            </h1>
            <span style={{ fontSize: '13px', background: 'rgba(0, 122, 255, 0.15)', color: '#007aff', padding: '4px 10px', borderRadius: '12px', fontWeight: '600' }}>
              {locations.length} {locations.length === 1 ? 'persona' : 'personas'}
            </span>
          </div>

          {/* Privacy & Sharing Toggle */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginTop: '16px', 
            padding: '12px 16px', 
            backgroundColor: 'var(--theme-bg, #121212)', 
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.04)'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--theme-text, #ffffff)' }}>
                Compartir mi ubicación
              </span>
              <span style={{ fontSize: '11px', color: 'var(--theme-text-variant, #888)' }}>
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
                backgroundColor: isSharing ? '#34c759' : '#39393d',
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
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--theme-text-variant, #888)', paddingLeft: '8px', marginBottom: '4px' }}>
            Personas
          </div>

          {locations.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--theme-text-variant, #888)', fontSize: '14px' }}>
              📡 Esperando señales de ubicación de la familia...
            </div>
          )}

          {locations.map((member) => {
            const isSelected = selectedMember?.id === member.id;
            return (
              <div 
                key={member.id}
                className={`find-my-member-card ${isSelected ? 'selected' : ''}`}
                onClick={() => handleSelectMember(member)}
              >
                {/* Avatar */}
                <div style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '50%',
                  backgroundColor: '#007aff',
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
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                }}>
                  {!member.photoURL && (member.name ? member.name.substring(0, 2).toUpperCase() : '👤')}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '600', fontSize: '15px', color: 'var(--theme-text, #ffffff)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {member.name} {member.id === (currentUser?.uid || nickname) ? '(Tú)' : ''}
                    </span>
                    {member.battery !== undefined && member.battery !== null && (
                      <span style={{ fontSize: '12px', color: member.battery < 20 ? '#ff5252' : '#34c759', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        🔋 {member.battery}%
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--theme-text-variant, #888)' }}>
                    <span>
                      {member.speed > 3 ? `🚗 ${member.speed} km/h` : '📍 En posición'}
                    </span>
                    <span>{formatLastSeen(member.lastSeen)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Map */}
      <div className="find-my-map-wrap">
        <MapContainer 
          center={mapCenter} 
          zoom={mapZoom} 
          style={{ width: '100%', height: '100%' }}
        >
          <ChangeMapView center={mapCenter} zoom={mapZoom} />
          
          {/* Free OpenStreetMap Tiles with Clean Dark/Light Map style */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
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
                  <div style={{ textAlign: 'center', padding: '4px' }}>
                    <strong style={{ fontSize: '14px' }}>{member.name}</strong>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                      Última señal: {formatLastSeen(member.lastSeen)}
                    </div>
                    {member.speed > 0 && (
                      <div style={{ fontSize: '12px', color: '#007aff', marginTop: '2px' }}>
                        Velocidad: {member.speed} km/h
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}

export default FindMy;
