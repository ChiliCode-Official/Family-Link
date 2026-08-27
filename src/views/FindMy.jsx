import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { auth, db } from '../services/firebase';
import { collection, doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { safeStorage } from '../services/storage';
import '../styles/find-my.css';

function ChangeMapView({ center, zoom, panelOpen }) {
  const map = useMap();

  useEffect(() => {
    const timer = window.setTimeout(() => map.invalidateSize(), 320);
    return () => window.clearTimeout(timer);
  }, [map, panelOpen]);

  useEffect(() => {
    if (center?.[0] && center?.[1]) {
      map.flyTo(center, zoom || 15, { duration: 1.1 });
    }
  }, [center, zoom, map]);

  return null;
}

const createAvatarIcon = (member, isSelected) => {
  const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);
  const initials = escapeHtml(member.name ? member.name.substring(0, 2).toUpperCase() : '•');
  const markerColor = /^#[0-9a-f]{3,8}$/i.test(member.color || '') ? member.color : '#006493';
  const safePhotoUrl = member.photoURL ? encodeURI(member.photoURL).replaceAll("'", '%27') : '';
  const photoStyle = safePhotoUrl ? `background-image:url('${safePhotoUrl}')` : '';
  const memberName = escapeHtml(member.name || 'Miembro');

  return L.divIcon({
    html: `
      <div class="find-my-avatar-marker ${isSelected ? 'is-selected' : ''}" style="--marker-color:${markerColor}">
        <div class="find-my-marker-halo"></div>
        <div class="find-my-avatar-pin" style="${photoStyle}">${safePhotoUrl ? '' : initials}</div>
        <div class="find-my-marker-label">${memberName}</div>
      </div>
    `,
    className: 'find-my-div-icon',
    iconSize: [72, 84],
    iconAnchor: [36, 48],
    popupAnchor: [0, -48]
  });
};

function BatteryLoader({ level }) {
  return (
    <span className={`find-my-battery-loader ${level < 30 ? 'is-low' : 'is-charging'}`} style={{ '--battery-level': `${Math.max(0, Math.min(100, level))}%` }} aria-label={`Batería ${level}%`}>
      <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M11.251.068a.5.5 0 0 1 .227.58L9.677 6.5H13a.5.5 0 0 1 .364.843l-8 8.5a.5.5 0 0 1-.842-.49L6.323 9.5H3a.5.5 0 0 1-.364-.843l8-8.5a.5.5 0 0 1 .615-.09z" /></svg>
    </span>
  );
}

function MapPinLoader() {
  return (
    <span className="find-my-map-loader" aria-hidden="true">
      <svg viewBox="0 0 24 30"><path d="M12 1.5C6.75 1.5 2.5 5.6 2.5 10.65c0 6.55 7.9 15.13 9.5 16.82 1.6-1.69 9.5-10.27 9.5-16.82C21.5 5.6 17.25 1.5 12 1.5Zm0 13.2a3.95 3.95 0 1 1 0-7.9 3.95 3.95 0 0 1 0 7.9Z" /></svg>
      <i />
    </span>
  );
}

function FindMy() {
  const locationWatchRef = useRef(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [nickname] = useState(safeStorage.get('familyNickname', ''));
  const [locations, setLocations] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [isSharing, setIsSharing] = useState(safeStorage.get('familyShareLocation', 'true') === 'true');
  const [batteryLevel, setBatteryLevel] = useState(null);
  const [geoError, setGeoError] = useState(null);
  const [panelOpen, setPanelOpen] = useState(() => typeof window === 'undefined' || window.innerWidth > 768);
  const [mapCenter, setMapCenter] = useState([19.4326, -99.1332]);
  const [mapZoom, setMapZoom] = useState(13);

  const effectiveUserId = (currentUser?.uid || nickname.toLowerCase() || 'yo').trim();

  useEffect(() => auth.onAuthStateChanged(setCurrentUser), []);

  useEffect(() => {
    if (!('getBattery' in navigator)) return undefined;
    let battery;
    const updateLevel = () => setBatteryLevel(Math.round(battery.level * 100));

    navigator.getBattery().then((batteryManager) => {
      battery = batteryManager;
      updateLevel();
      battery.addEventListener('levelchange', updateLevel);
    }).catch(() => {});

    return () => battery?.removeEventListener('levelchange', updateLevel);
  }, []);

  useEffect(() => {
    const locRef = collection(db, 'locations');
    return onSnapshot(locRef, (snapshot) => {
      const byMember = new Map();

      snapshot.docs.forEach((locationDoc) => {
        const data = locationDoc.data();
        const key = data.name?.trim().toLowerCase() || locationDoc.id;
        const previous = byMember.get(key);
        if (!previous || (data.lastSeen || 0) > (previous.lastSeen || 0)) {
          byMember.set(key, { id: locationDoc.id, ...data });
        }
      });

      const nextLocations = Array.from(byMember.values());
      setLocations(nextLocations);
      if (nextLocations.length && !selectedMember) {
        const me = nextLocations.find((member) => member.id === effectiveUserId) || nextLocations[0];
        if (me.latitude && me.longitude) setMapCenter([me.latitude, me.longitude]);
      }
    }, (error) => {
      if (error.code !== 'permission-denied') {
        console.warn('No se pudieron sincronizar las ubicaciones:', error);
      }
    });
  }, [effectiveUserId, selectedMember]);

  useEffect(() => {
    if (!isSharing || !navigator.geolocation) return undefined;

    const myName = nickname || currentUser?.displayName?.split(' ')[0] || 'Yo';
    locationWatchRef.current = navigator.geolocation.watchPosition(
      async ({ coords }) => {
        setGeoError(null);
        try {
          await setDoc(doc(db, 'locations', effectiveUserId), {
            name: myName,
            userId: currentUser?.uid || '',
            photoURL: currentUser?.photoURL || '',
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: Math.round(coords.accuracy || 0),
            speed: coords.speed ? Math.round(coords.speed * 3.6) : 0,
            heading: coords.heading || 0,
            battery: batteryLevel,
            updatedAt: serverTimestamp(),
            lastSeen: Date.now()
          }, { merge: true });
        } catch (error) {
          console.error('Error al actualizar ubicación en Firestore:', error);
        }
      },
      (error) => {
        if (error.code === 1) {
          setGeoError('El permiso de ubicación está bloqueado. Actívalo desde la barra del navegador.');
        }
      },
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 20000 }
    );

    return () => {
      if (locationWatchRef.current !== null) {
        navigator.geolocation.clearWatch(locationWatchRef.current);
        locationWatchRef.current = null;
      }
    };
  }, [isSharing, currentUser, nickname, batteryLevel, effectiveUserId]);

  const toggleSharing = () => {
    const nextValue = !isSharing;
    setIsSharing(nextValue);
    safeStorage.set('familyShareLocation', String(nextValue));
  };

  const selectMember = (member) => {
    setSelectedMember(member);
    if (member.latitude && member.longitude) {
      setMapCenter([member.latitude, member.longitude]);
      setMapZoom(16);
      if (window.innerWidth <= 768) setPanelOpen(false);
    }
  };

  const locateMe = () => {
    const me = locations.find((member) => member.id === effectiveUserId);
    if (me?.latitude && me?.longitude) {
      setMapCenter([me.latitude, me.longitude]);
      setMapZoom(16);
      return;
    }

    navigator.geolocation?.getCurrentPosition(({ coords }) => {
      setMapCenter([coords.latitude, coords.longitude]);
      setMapZoom(16);
    });
  };

  const formatLastSeen = (timestamp) => {
    if (!timestamp) return 'Sin datos recientes';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Ahora';
    if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)} min`;
    if (seconds < 86400) return `Hace ${Math.floor(seconds / 3600)} h`;
    return 'Hace más de un día';
  };

  return (
    <div className="find-my-container">
      <aside className={`find-my-sidebar ${panelOpen ? 'is-open' : ''}`} aria-label="Ubicaciones de la familia">
        <div className="find-my-panel-handle" aria-hidden="true" />
        <header className="find-my-sidebar-header">
          <div>
            <p className="find-my-eyebrow">UBICACIÓN FAMILIAR</p>
            <div className="find-my-title-row">
              <h1>Familia</h1>
              <span className="find-my-online-count">{locations.length} en línea</span>
            </div>
          </div>
          <button className="find-my-close-panel" onClick={() => setPanelOpen(false)} aria-label="Volver al mapa">←</button>
        </header>

        <div className="find-my-sharing-row">
          <div>
            <strong>Compartir mi ubicación</strong>
            <span>{isSharing ? 'Tu familia puede verte' : 'Ubicación en pausa'}</span>
          </div>
          <button
            className={`find-my-toggle ${isSharing ? 'is-active' : ''}`}
            type="button"
            role="switch"
            aria-checked={isSharing}
            onClick={toggleSharing}
          ><span /></button>
        </div>

        {geoError && <div className="find-my-error">{geoError}</div>}

        <div className="find-my-member-list">
          {locations.length === 0 && (
            <div className="find-my-empty-state">
              <span aria-hidden="true">⌖</span>
              <strong>Buscando a tu familia</strong>
              <p>Las ubicaciones aparecerán aquí cuando estén disponibles.</p>
            </div>
          )}

          {locations.map((member) => {
            const selected = selectedMember?.id === member.id;
            const initials = member.name ? member.name.substring(0, 2).toUpperCase() : '•';
            return (
              <article
                key={member.id}
                className={`find-my-member-card ${selected ? 'is-selected' : ''}`}
                onClick={() => selectMember(member)}
              >
                <div
                  className="find-my-list-avatar"
                  style={{ backgroundImage: member.photoURL ? `url(${member.photoURL})` : 'none' }}
                >{member.photoURL ? '' : initials}</div>
                <div className="find-my-member-info">
                  <div className="find-my-member-heading">
                    <strong>{member.name}{member.id === effectiveUserId ? ' (Tú)' : ''}</strong>
                    {member.battery != null && (
                      <span className={`find-my-battery-value ${member.battery < 30 ? 'is-low' : ''}`}><BatteryLoader level={member.battery} />{member.battery}%</span>
                    )}
                  </div>
                  <div className="find-my-member-meta">
                    <span>{member.speed > 3 ? `${member.speed} km/h` : 'En posición'}</span>
                    <span>{formatLastSeen(member.lastSeen)}</span>
                  </div>
                  {member.latitude && member.longitude && (
                    <button
                      className="find-my-directions"
                      onClick={(event) => {
                        event.stopPropagation();
                        window.open(`https://www.google.com/maps/dir/?api=1&destination=${member.latitude},${member.longitude}`, '_blank');
                      }}
                    ><MapPinLoader />Cómo llegar <span aria-hidden="true">›</span></button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </aside>

      <main className="find-my-map-wrap">
        <div className="find-my-map-toolbar">
          <button className="find-my-family-button" onClick={() => setPanelOpen(true)}>
            Familia <span>{locations.length}</span>
          </button>
          <button className="find-my-locate-button" onClick={locateMe} aria-label="Centrar en mi ubicación" title="Centrar en mi ubicación"><MapPinLoader /></button>
        </div>

        <MapContainer center={mapCenter} zoom={mapZoom} zoomControl>
          <ChangeMapView center={mapCenter} zoom={mapZoom} panelOpen={panelOpen} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {locations.map((member) => member.latitude && member.longitude ? (
            <Marker
              key={member.id}
              position={[member.latitude, member.longitude]}
              icon={createAvatarIcon(member, selectedMember?.id === member.id)}
              eventHandlers={{ click: () => selectMember(member) }}
            >
              <Popup>
                <div className="find-my-popup">
                  <strong>{member.name}</strong>
                  <span>{formatLastSeen(member.lastSeen)}</span>
                  {member.battery != null && <span className="find-my-popup-battery"><BatteryLoader level={member.battery} /> Batería {member.battery}%</span>}
                  {member.latitude && member.longitude && (
                    <button
                      className="find-my-popup-directions"
                      onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${member.latitude},${member.longitude}`, '_blank')}
                    ><MapPinLoader />Cómo llegar</button>
                  )}
                </div>
              </Popup>
            </Marker>
          ) : null)}
        </MapContainer>
      </main>
    </div>
  );
}

export default FindMy;
