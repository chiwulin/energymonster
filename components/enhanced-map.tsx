'use client'

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect } from 'react'

const EnhancedMap = ({ energySources }: { energySources: any[] }) => {
    useEffect(() => {
        // Leaflet icon setup
        // @ts-ignore
        delete L.Icon.Default.prototype._getIconUrl
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon-2x.png',
            iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png',
        })
    }, [])

    return (
        <div className="w-full h-96 rounded-lg overflow-hidden mb-4">
            <MapContainer center={[53.7267, -127.6476]} zoom={5} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                {energySources.map((source, index) => (
                    <Marker key={index} position={source.coordinates}>
                        <Popup>
                            <div>
                                <h3 className="font-bold">{source.source}</h3>
                                <p>{source.location}</p>
                                <p>{source.percentage.toFixed(1)}%</p>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    )
}

export default EnhancedMap
