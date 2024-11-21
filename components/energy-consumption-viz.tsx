'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import { forceSimulation, forceCollide, forceCenter, forceManyBody } from 'd3-force'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Leaflet icon setup
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png',
})

// Add new constants for bubble states and colors
const BUBBLE_STATES = {
  HAPPY: 'happy',
  NEUTRAL: 'neutral',
  HUNGRY: 'hungry'
}

const BUBBLE_COLORS = {
  ORANGE: '#FFBA33',
  BLUE: '#0984CF',
  RED: '#EA4F44',
  GREEN: '#00A655'
}

// Expanded list of appliances with typical energy consumption (in watts)
const initialAppliances = [
  { id: 1, name: 'LED Light', startTime: new Date(), duration: 0, energyConsumption: 10, state: BUBBLE_STATES.HAPPY, lastFed: new Date(), color: BUBBLE_COLORS.GREEN },
  { id: 2, name: 'TV', startTime: new Date(), duration: 0, energyConsumption: 100, state: BUBBLE_STATES.HAPPY, lastFed: new Date(), color: BUBBLE_COLORS.GREEN },
  { id: 3, name: 'Refrigerator', startTime: new Date(), duration: 0, energyConsumption: 150, state: BUBBLE_STATES.HAPPY, lastFed: new Date(), color: BUBBLE_COLORS.BLUE },
  { id: 4, name: 'Phone Charger', startTime: new Date(), duration: 0, energyConsumption: 5, state: BUBBLE_STATES.HAPPY, lastFed: new Date(), color: BUBBLE_COLORS.GREEN },
  { id: 5, name: 'Laptop', startTime: new Date(), duration: 0, energyConsumption: 50, state: BUBBLE_STATES.HAPPY, lastFed: new Date(), color: BUBBLE_COLORS.GREEN },
  { id: 6, name: 'Washing Machine', startTime: new Date(), duration: 0, energyConsumption: 500, state: BUBBLE_STATES.HAPPY, lastFed: new Date(), color: BUBBLE_COLORS.BLUE },
  { id: 7, name: 'Dishwasher', startTime: new Date(), duration: 0, energyConsumption: 1200, state: BUBBLE_STATES.HAPPY, lastFed: new Date(), color: BUBBLE_COLORS.ORANGE },
  { id: 8, name: 'Air Conditioner', startTime: new Date(), duration: 0, energyConsumption: 1500, state: BUBBLE_STATES.HAPPY, lastFed: new Date(), color: BUBBLE_COLORS.RED },
  { id: 9, name: 'Microwave', startTime: new Date(), duration: 0, energyConsumption: 1100, state: BUBBLE_STATES.HAPPY, lastFed: new Date(), color: BUBBLE_COLORS.ORANGE },
  { id: 10, name: 'Electric Oven', startTime: new Date(), duration: 0, energyConsumption: 2000, state: BUBBLE_STATES.HAPPY, lastFed: new Date(), color: BUBBLE_COLORS.RED },
  { id: 11, name: 'Water Heater', startTime: new Date(), duration: 0, energyConsumption: 4000, state: BUBBLE_STATES.HAPPY, lastFed: new Date(), color: BUBBLE_COLORS.RED },
  { id: 12, name: 'Hair Dryer', startTime: new Date(), duration: 0, energyConsumption: 1800, state: BUBBLE_STATES.HAPPY, lastFed: new Date(), color: BUBBLE_COLORS.RED },
]

// Custom hook to simulate real-time updates
const useSimulatedUpdates = (initialData) => {
  const [data, setData] = useState(initialData)

  useEffect(() => {
    const interval = setInterval(() => {
      setData(prevData => 
        prevData.map(appliance => {
          // 計算合理的波動範圍 (基準值的 ±10%)
          const baseConsumption = initialAppliances.find(
            a => a.id === appliance.id
          ).energyConsumption
          const maxVariation = baseConsumption * 0.1
          
          // 隨機定是增加還是減
          const variation = (Math.random() - 0.5) * 2 * maxVariation
          
          // 確保新值在基準值的 ±10% 範圍內
          const newConsumption = Math.max(
            baseConsumption * 0.9,
            Math.min(
              baseConsumption * 1.1,
              appliance.energyConsumption + variation
            )
          )

          return {
            ...appliance,
            duration: appliance.duration + 1,
            energyConsumption: newConsumption
          }
        })
      )
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return data
}

// Simulated energy source data for Vancouver/BC
const useEnergySourceData = () => {
  const [data, setData] = useState([
    { source: 'Hydroelectric', percentage: 86.3, location: 'Revelstoke, BC', coordinates: [51.0, -118.2], icon: 'water_drop' },
    { source: 'Biomass', percentage: 8.7, location: 'Prince George, BC', coordinates: [53.9, -122.8], icon: 'compost' },
    { source: 'Wind', percentage: 2.9, location: 'Northeast BC', coordinates: [56.2, -120.8], icon: 'air' },
    { source: 'Natural Gas', percentage: 1.9, location: 'Fort Nelson, BC', coordinates: [58.8, -122.7], icon: 'local_fire_department' },
    { source: 'Solar', percentage: 0.2, location: 'Kimberley, BC', coordinates: [49.7, -115.8], icon: 'wb_sunny' },
  ])

  useEffect(() => {
    const interval = setInterval(() => {
      setData(prevData => prevData.map(source => ({
        ...source,
        percentage: Math.max(0, Math.min(100, source.percentage + (Math.random() - 0.5) * 2))
      })))
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  return data
}

// Add this new constant for the power food SVG
const PowerFoodIcon = () => (
  <svg width="31" height="43" viewBox="0 0 31 43" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15.2945 3.13747C15.7763 3.12212 16.257 3.14538 16.7388 3.1453L19.7743 3.17234C20.2712 3.17318 20.7686 3.11739 21.2675 3.1176C24.4544 3.11813 27.0618 3.19995 30.1946 3.69281C29.725 4.2889 29.1734 4.83434 28.6544 5.3873L19.17 15.5657C18.5314 16.2379 15.357 19.3073 15.4287 19.8754C15.4669 20.1786 15.7009 20.3239 15.9012 20.5152C16.2023 21.4368 18.5053 21.1845 19.4153 21.2172C21.127 21.2789 26.4439 21.3969 27.9689 21.7823C27.2461 22.554 26.3676 23.2084 25.5822 23.917L9.51114 38.7238C9.27078 38.9422 8.99499 39.2541 8.7167 39.4155C8.34979 39.4725 8.04732 39.6876 7.66576 39.6831C7.86304 39.2761 8.11258 38.8818 8.33107 38.4847C8.55299 38.1341 8.77247 37.7843 9.01938 37.4505C9.16897 37.078 9.30671 36.736 9.54656 36.4096C9.80726 35.8801 10.0677 35.3531 10.4068 34.8682C10.5657 34.5079 10.7429 34.1607 10.9252 33.8122C11.115 33.3577 11.3465 32.9156 11.5876 32.4865C11.7331 32.1373 11.9044 31.7742 12.1053 31.4534C12.3731 30.878 12.6797 30.3202 12.9777 29.76C13.1197 29.4512 13.2702 29.1818 13.4919 28.9226C13.6813 28.3228 13.9598 27.7794 14.2735 27.2356C14.5778 26.6975 14.8818 26.1625 15.1194 25.5906C14.9096 24.5197 13.9766 24.695 13.1056 24.6449L11.2752 24.53C8.47131 24.3509 5.81224 24.2166 3.01369 24.1322L2.97018 24.1305C2.82819 24.0845 2.66465 24.0783 2.51643 24.0606C2.74555 23.5773 3.06314 23.1164 3.35786 22.6705C3.52803 22.3768 3.70421 22.042 3.93508 21.7932C4.21321 21.2911 4.52451 20.8002 4.84857 20.3266C5.05866 19.9851 5.25715 19.639 5.54029 19.3512C5.71188 18.8369 6.00667 18.4239 6.30151 17.9741C6.52623 17.5973 6.75117 17.0977 7.09202 16.8134C7.27779 16.3759 7.5174 15.9834 7.76316 15.5782C7.95536 15.2497 8.14539 14.8989 8.38686 14.6044C8.6217 14.1801 8.87428 13.7681 9.12837 13.3553L9.64177 12.4808C9.84797 12.0542 10.1144 11.6474 10.3763 11.2535C10.57 10.9286 10.7587 10.5997 10.9745 10.2889C11.2137 9.81883 11.4182 9.38924 11.8203 9.03574C11.9627 8.62742 12.1515 8.28265 12.4131 7.93834L13.2614 6.47702C13.4291 6.20548 13.6009 5.93862 13.7817 5.67548C14.1129 5.06603 14.4716 4.46905 14.8178 3.86783C14.9722 3.62181 15.1354 3.38058 15.2945 3.13747Z" fill="#FECA04"/>
  </svg>
);

// 统一使用计算大小的函数
const calculateBubbleSize = (energyConsumption: number) => {
  return Math.max(50, Math.min(200, energyConsumption / 10))
}

// Bubble component
const Bubble = ({ appliance, x, y }) => {
  const [state, setState] = useState(appliance.state)
  const [isFeeding, setIsFeeding] = useState(false)
  const [lastFed, setLastFed] = useState(appliance.lastFed)
  
  // 初始化 motion 和 spring 值
  const dragX = useMotionValue(x)
  const dragY = useMotionValue(y)
  const springConfig = { damping: 50, stiffness: 100 }
  const springX = useSpring(dragX, springConfig)
  const springY = useSpring(dragY, springConfig)

  useEffect(() => {
    dragX.set(x)
    dragY.set(y)
  }, [x, y])

  // 处理喂食动画
  useEffect(() => {
    if (isFeeding) {
      const timeout = setTimeout(() => {
        setIsFeeding(false)
        setState(BUBBLE_STATES.HAPPY)
        setLastFed(new Date())
      }, 1000)
      return () => clearTimeout(timeout)
    }
  }, [isFeeding])

  // 添加 handleFeed 函数
  const handleFeed = () => {
    if (!isFeeding) {  // 防止重复触发
      setIsFeeding(true)
    }
  }

  const size = calculateBubbleSize(appliance.energyConsumption)

  return (
    <motion.div
      drag
      dragElastic={0.05}
      dragMomentum={false}
      dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
      style={{
        x: springX,
        y: springY,
        position: 'absolute',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        cursor: 'grab',
        background: appliance.color,
        borderRadius: '50%',
        width: size,
        height: size,
        transform: 'translate(-50%, -50%)',
      }}
      onClick={handleFeed}
    >
      {isFeeding && (
        <motion.div
          initial={{ opacity: 0, scale: 0, y: 0 }}
          animate={{ opacity: 1, scale: 1, y: -50 }}
          exit={{ opacity: 0, scale: 0, y: -100 }}
          transition={{ duration: 0.5 }}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 10
          }}
        >
          <PowerFoodIcon />
        </motion.div>
      )}
      
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          animate={isFeeding ? { scale: [1, 1.2, 1] } : {}}
          transition={{ duration: 0.5 }}
          className="w-full h-full flex items-center justify-center"
        >
          {state === BUBBLE_STATES.HAPPY && (
            <svg width="60%" height="60%" viewBox="0 0 1169 321" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="742.5" cy="60.5" r="60.5" fill="black"/>
              <circle cx="368.5" cy="60.5" r="60.5" fill="black"/>
              <path d="M17 228C463.439 330.502 711.862 328.892 1152.1 228" stroke="black" stroke-width="33" stroke-linecap="round"/>
            </svg>
          )}
          {state === BUBBLE_STATES.NEUTRAL && (
            <svg width="70%" height="70%" viewBox="0 0 773 542" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M101.954 524.752C357.285 110.234 500.605 115.28 755.954 524.752" stroke="black" stroke-width="33" stroke-linecap="round"/>
              <path d="M56.0767 63.1812C67.7638 64.642 137.051 188.247 141.335 183.963" stroke="black" stroke-width="33" stroke-linecap="round"/>
              <path d="M155.544 45.4189C154.634 52.6994 128.252 76.0214 122.98 81.7325C107.036 99.0059 88.107 118.443 73.8386 136.992C65.1814 148.247 49.6417 154.479 39.8933 164.227C33.7748 170.346 26.03 176.858 17 176.858" stroke="black" stroke-width="33" stroke-linecap="round"/>
              <path d="M635.12 38.3145C651.844 55.0379 664.599 80.0083 675.973 100.482C684.097 115.105 694.804 137.428 709.721 144.887" stroke="black" stroke-width="33" stroke-linecap="round"/>
              <path d="M723.931 17C722.637 27.3494 692.369 52.8806 684.657 59.629C669.259 73.1024 648.95 83.6308 631.963 94.9557C614.674 106.482 600.408 120.02 578.282 120.02" stroke="black" stroke-width="33" stroke-linecap="round"/>
            </svg>
          )}
          {state === BUBBLE_STATES.HUNGRY && (
            <svg width="40" height="40" viewBox="0 0 40 40">
              <circle cx="12" cy="15" r="2" fill="black" />
              <circle cx="28" cy="15" r="2" fill="black" />
              <path d="M12 28 Q20 22 28 28" stroke="black" fill="none" strokeWidth="2" />
            </svg>
          )}
        </motion.div>
      </div>
      
      <div
        style={{
          position: 'absolute',
          bottom: '-40px',
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center',
          whiteSpace: 'nowrap',
        }}
      >
        <div className="font-bold text-white">{appliance.name}</div>
        <div className="text-white">{`${Math.round(appliance.energyConsumption)}W`}</div>
      </div>
    </motion.div>
  )
}

// Enhanced Map component using React Leaflet
const EnhancedMap = ({ energySources }) => {
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

export function EnergyConsumptionVizComponent() {
  const appliances = useSimulatedUpdates(initialAppliances)
  const energySources = useEnergySourceData()
  const [nodes, setNodes] = useState([])
  const simulationRef = useRef(null)
  const containerRef = useRef(null)
  const frameRef = useRef(0) // 用于 requestAnimationFrame

  useEffect(() => {
    if (!containerRef.current) return

    const width = containerRef.current.clientWidth
    const height = containerRef.current.clientHeight

    const initializedAppliances = appliances.map(appliance => ({
      ...appliance,
      x: width / 2 + (Math.random() - 0.5) * 100,
      y: height / 2 + (Math.random() - 0.5) * 100,
      vx: 0,
      vy: 0
    }))

    simulationRef.current = forceSimulation(initializedAppliances)
      .force('charge', forceManyBody()
        .strength(d => -Math.pow(calculateBubbleSize(d.energyConsumption), 0.5) * 0.5)
      )
      .force('collide', forceCollide()
        .radius(d => calculateBubbleSize(d.energyConsumption) / 2 + 10)
        .strength(1)
      )
      .force('center', forceCenter(width / 2, height / 2)
        .strength(0.15)
      )
      .velocityDecay(0.3)
      .alpha(0.3)
      .alphaDecay(0.02)

    // 使用 requestAnimationFrame 优化渲染
    const updateNodesPosition = () => {
      if (simulationRef.current) {
        // 获取最新的节点位置
        const currentNodes = simulationRef.current.nodes()
        
        // 创建新的数组以确保状态更新
        setNodes([...currentNodes])
        
        // 继续下一帧动画
        frameRef.current = requestAnimationFrame(updateNodesPosition)
      }
    }

    // 添加随机力
    const addRandomForce = () => {
      if (!simulationRef.current) return
      
      simulationRef.current.nodes().forEach(node => {
        const forceMagnitude = Math.sqrt(node.energyConsumption) * 0.01
        node.vx = (node.vx || 0) + (Math.random() - 0.5) * forceMagnitude
        node.vy = (node.vy || 0) + (Math.random() - 0.5) * forceMagnitude
      })
      simulationRef.current.alpha(0.5).restart()
    }

    // 启动动画循环
    frameRef.current = requestAnimationFrame(updateNodesPosition)

    // 定期添加随机力
    const randomForceInterval = setInterval(addRandomForce, 1000)

    // 清理函数
    return () => {
      if (simulationRef.current) {
        simulationRef.current.stop()
      }
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
      clearInterval(randomForceInterval)
    }
  }, [appliances])

  // 当组件更新时重新启动模拟
  useEffect(() => {
    if (simulationRef.current) {
      simulationRef.current.nodes(appliances)
      simulationRef.current.alpha(0.3).restart()
    }
  }, [appliances])

  // 计算总 Watts
  const totalWatts = useMemo(() => {
    return appliances.reduce((sum, appliance) => sum + appliance.energyConsumption, 0)
  }, [appliances])

  return (
    <div className="w-full min-h-screen bg-black text-white p-4">
      {/* 添加标题区域 */}
      <div className="absolute top-10 left-10 z-10">
        <h2 
          style={{
            color: '#FFF',
            fontFamily: 'SF Pro',
            fontSize: '2rem',
            fontStyle: 'normal',
            fontWeight: 590,
            lineHeight: 'normal',
            letterSpacing: '-0.96px',
          }}
        >
          Justin's Home
        </h2>
        <div 
          style={{
            color: '#CACACA',
            fontFamily: 'SF Pro Rounded',
            fontSize: '1.5rem',
            fontStyle: 'normal',
            fontWeight: 400,
            lineHeight: 'normal',
            letterSpacing: '-0.96px',
            marginTop: '4px', // 添加一点间距
          }}
        >
          {Math.round(totalWatts)}W
        </div>
      </div>

      {/* 原有的容器和气泡 */}
      <div ref={containerRef} className="relative w-full h-[calc(100vh-200px)] bg-black rounded-lg overflow-hidden">
        {nodes.map((node) => (
          <Bubble 
            key={node.id} 
            appliance={node} 
            x={node.x} 
            y={node.y} 
          />
        ))}
      </div>
      
      <h2 className="text-xl font-bold mb-2">Energy Sources in British Columbia</h2>
      <EnhancedMap energySources={energySources} />
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8"></TableHead>
            <TableHead>Energy Source</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Percentage</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {energySources.map((source) => (
            <TableRow key={source.source}>
              <TableCell>
                <div className="w-6 h-6">
                  {source.icon && (
                    <img 
                      src={source.icon} 
                      alt={`${source.source} icon`}
                      className="w-6 h-6"
                    />
                  )}
                </div>
              </TableCell>
              <TableCell>{source.source}</TableCell>
              <TableCell>{source.location}</TableCell>
              <TableCell>{source.percentage.toFixed(1)}%</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}