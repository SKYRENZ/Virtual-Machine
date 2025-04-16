"use client"

import { useState, useEffect, useRef } from "react"
import "./custom.css"
import { Tooltip } from 'react-tooltip'
import CircularGaugeSpeedTest from '../components/CircularGaugeSpeedTest'
import BandwidthUsageGraph from '../components/BandwidthUsageGraph'
import ConnectionQualityMonitor from '../components/ConnectionQualityMonitor'
import IOMonitor from '../components/IOMonitor'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

// Add CSS for animations
const animationStyles = `
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.fade-in {
  animation: fadeIn 0.8s ease-out forwards;
}

.delay-1 {
  animation-delay: 0.1s;
}

.delay-2 {
  animation-delay: 0.3s;
}

.delay-3 {
  animation-delay: 0.5s;
}
`;

const API_URL = 'http://localhost:5000/api'

interface NetworkData {
  connectionType: string
  signalStrength: number
  downloadSpeed: number
  uploadSpeed: number
  ping: number
  jitter: number
  packetLoss: number
  stability: number
  ipAddress: string
  dnsServer: string
  macAddress: string
}

interface IOData {
  uploadSpeed: number
  downloadSpeed: number
  uploadPackets: number
  downloadPackets: number
  activeInterfaces: string[]
  bytesSent: number
  bytesReceived: number
}

interface SpeedTestResult {
  download: number
  upload: number
  ping: number
  server?: {
    name: string
    location: string
    sponsor: string
    latency: number
    distance: string
  }
}

interface ConnectedDevice {
  id: string
  name: string
  status: string
  ipAddress: string
  macAddress: string
}

interface BandwidthDataPoint {
  timestamp: string
  download: number
  upload: number
}

interface NetworkProps {
  networkState: {
    speedTestCompleted: boolean;
    speedTestData: SpeedTestResult | null;
  };
  setNetworkState: React.Dispatch<React.SetStateAction<{
    speedTestCompleted: boolean;
    speedTestData: SpeedTestResult | null;
  }>>;
}

export const Network = ({ networkState, setNetworkState }: NetworkProps) => {
  const [networkData, setNetworkData] = useState<NetworkData | null>({
    connectionType: "Unknown",
    signalStrength: 0,
    downloadSpeed: 0,
    uploadSpeed: 0,
    ping: 0,
    jitter: 0,
    packetLoss: 0,
    stability: 0,
    ipAddress: "Not available",
    dnsServer: "Not available",
    macAddress: "Not available"
  })
  const [ioData, setIOData] = useState<IOData | null>({
    uploadSpeed: 0,
    downloadSpeed: 0,
    uploadPackets: 0,
    downloadPackets: 0,
    activeInterfaces: [],
    bytesSent: 0,
    bytesReceived: 0
  })
  const [connectedDevices, setConnectedDevices] = useState<ConnectedDevice[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isRunningSpeedTest, setIsRunningSpeedTest] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [bandwidthHistory, setBandwidthHistory] = useState<BandwidthDataPoint[]>([])
  const [latencyHistory, setLatencyHistory] = useState<number[]>([])
  const [timeRange, setTimeRange] = useState<'5min' | '1hour' | '1day'>('5min')
  const contentRef = useRef<HTMLDivElement>(null);

  // Fetch all network data
  const fetchData = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`${API_URL}/all`)
      const data = await response.json()

      setNetworkData(data.networkData)
      setIOData(data.ioData)
      setConnectedDevices(data.connectedDevices)
      setBandwidthHistory(data.bandwidthHistory || [])
      setLatencyHistory(data.latencyHistory || [])
      setLastUpdated(new Date(data.lastUpdated))
      setError(null)
    } catch (err) {
      console.error('Error fetching network data:', err)
      setError('Failed to fetch network data. Make sure the Python backend is running.')
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch bandwidth history
  const fetchBandwidthHistory = async () => {
    try {
      const response = await fetch(`${API_URL}/bandwidth-history?timeframe=${timeRange}`)
      const data = await response.json()
      setBandwidthHistory(data)
    } catch (err) {
      console.error('Error fetching bandwidth history:', err)
    }
  }

  // Run speed test
  const handleRunSpeedTest = async () => {
    try {
      setIsRunningSpeedTest(true)
      setNetworkState(prev => ({ ...prev, speedTestData: null }))

      // Simulate a minimal delay for the test UI feedback
      await new Promise(resolve => setTimeout(resolve, 500))

      const response = await fetch(`${API_URL}/speedtest`)
      const data = await response.json()

      // Check if the response contains an error
      if (data.error) {
        setError(data.error)
        setNetworkState(prev => ({ ...prev, speedTestData: null }))
      } else {
        setNetworkState(prev => ({ ...prev, speedTestData: data }))
        // Refresh all network data after speed test completes
        await fetchData()
        // Set the speed test as completed to show remaining content
        setNetworkState(prev => ({ ...prev, speedTestCompleted: true }))

        // Refresh data again after a short delay to ensure I/O Monitor is updated
        setTimeout(fetchData, 1000)
        setTimeout(fetchData, 3000)
      }
    } catch (err) {
      console.error('Error running speed test:', err)
      setError('Failed to run speed test.')
    } finally {
      setIsRunningSpeedTest(false)
    }
  }

  // Handle time range change for bandwidth graph
  const handleTimeRangeChange = (newRange: '5min' | '1hour' | '1day') => {
    setTimeRange(newRange)
  }

  // Initial data fetch and set up refresh interval
  useEffect(() => {
    fetchData()

    // Refresh data every 30 seconds
    const interval = setInterval(fetchData, 30000)

    // Cleanup function
    return () => {
      clearInterval(interval)
      // Clear history when component unmounts
      fetch(`${API_URL}/clear-history`).catch(err =>
        console.error('Error clearing history:', err)
      )
    }
  }, [])

  // Fetch bandwidth history when time range changes
  useEffect(() => {
    fetchBandwidthHistory()
  }, [timeRange])

  const getSignalQuality = (signal: number) => {
    if (signal === 0) return { text: "Not tested", color: "#808080" }
    if (signal >= 95) return { text: "Excellent", color: "#00FF00" }
    if (signal >= 85) return { text: "Very Good", color: "#66FF66" }
    if (signal >= 70) return { text: "Good", color: "#99FF99" }
    if (signal >= 60) return { text: "Fair", color: "#FFCC00" }
    if (signal >= 45) return { text: "Poor", color: "#FF9900" }
    if (signal >= 30) return { text: "Weak", color: "#FF6600" }
    return { text: "Very Weak", color: "#FF3333" }
  }

  const formatSpeed = (speed: number) => {
    return speed.toFixed(1)
  }

  const formatIP = (ip: string | undefined) => {
    return ip || "Not available"
  }

  const getDeviceIcon = (deviceName: string) => {
    const name = deviceName.toLowerCase();
    if (name.includes("router")) return "fa-wifi";
    if (name.includes("phone") || name.includes("mobile") || name.includes("android") || name.includes("iphone")) return "fa-mobile-alt";
    if (name.includes("this device")) return "fa-desktop";
    return "fa-laptop";
  }

  if (error) {
    return (
      <div className="page-content" style={{ backgroundColor: '#000000' }}>
        <div className="error-container">
          <h2 style={{ color: '#FFFFFF' }}>Error</h2>
          <p style={{ color: '#CCCCCC' }}>{error}</p>
          <button
            className="btn"
            onClick={fetchData}
            style={{
              backgroundColor: 'transparent',
              color: '#00FF00',
              border: '1px solid #00FF00'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const quality = getSignalQuality(networkData?.signalStrength || 0)

  return (
    <div className="page-content d-flex flex-column min-vh-100" style={{
      backgroundColor: '#000000',
      width: '100vw',
      overflowX: 'hidden'
    }}>
      <style>{animationStyles}</style>

      {/* Main content container */}
      <div className="d-flex flex-column align-items-center w-100">
        {/* Capture container */}
        <div className="capture-container" ref={contentRef} style={{
          width: '100%',
          maxWidth: '1200px',
          margin: '0 auto',
          backgroundColor: '#000000',
          padding: '0 40px 20px 40px'
        }}>
          {/* Header */}
          <div className="mb-4" style={{
            background: 'linear-gradient(to right, rgba(0, 255, 0, 0.15), transparent 80%)',
            borderBottom: '1px solid rgba(0, 255, 0, 0.3)',
            padding: '1.5rem 20px',
            marginBottom: '2rem',
            position: 'relative'
          }}>
            <div className="d-flex justify-content-center align-items-center">
              <h1 style={{
                color: '#ffff',
                fontWeight: 'bold',
                margin: 0,
                fontSize: '1.5rem',
                letterSpacing: '0.05em',
                textAlign: 'center'
              }}>NETWORK MONITOR</h1>
            </div>
          </div>

          {/* Dashboard Content */}
          <div className="dashboard-content" style={{ padding: '0 20px' }}>
            <div className="row g-4 mx-0">
              {/* Speed Test Section */}
              <div className="col-12 px-0">
                <div className="card border-0 shadow-lg" style={{
                  backgroundColor: '#121212',
                  ...((!networkState.speedTestCompleted) && {
                    maxWidth: '900px',
                    margin: '2rem auto'
                  })
                }}>
                  <div className="card-body">
                    <h5 className="card-title mb-3" style={{ color: '#00FF00' }}>
                      <i className="fas fa-tachometer-alt me-2"></i>
                      Speed Test
                      {!networkState.speedTestCompleted && (
                        <small style={{ color: '#CCCCCC', fontSize: '0.8rem', marginLeft: '10px' }}>
                          Run a speed test to see all network data
                        </small>
                      )}
                    </h5>

                    <CircularGaugeSpeedTest
                      isRunning={isRunningSpeedTest}
                      downloadSpeed={networkState.speedTestData?.download || null}
                      uploadSpeed={networkState.speedTestData?.upload || null}
                      ping={networkState.speedTestData?.ping || null}
                      onStartTest={handleRunSpeedTest}
                    />

                    {isRunningSpeedTest && (
                      <div className="test-server-info mt-3 text-center">
                        <p style={{ color: '#CCCCCC', fontSize: '0.9rem' }}>
                          <i className="fas fa-spinner fa-spin me-2"></i>
                          Running enhanced accuracy test (may take 20-30 seconds)...
                        </p>
                      </div>
                    )}

                    {networkState.speedTestData && networkState.speedTestData.server && (
                      <div className="test-server-info mt-3 text-center">
                        <p style={{ color: '#CCCCCC', fontSize: '0.9rem' }}>
                          <i className="fas fa-server me-2"></i>
                          {networkState.speedTestData.server.name && (
                            <>
                              Test Server: <span style={{ color: '#66FF66' }}>{networkState.speedTestData.server.name}</span>
                              <br />
                            </>
                          )}
                          {networkState.speedTestData.server.location && networkState.speedTestData.server.location !== "Unknown" && (
                            <>
                              Location: <span style={{ color: '#66FF66' }}>{networkState.speedTestData.server.location}</span>
                              <br />
                            </>
                          )}
                          {networkState.speedTestData.server.sponsor && networkState.speedTestData.server.sponsor !== "Unknown" && (
                            <>
                              Host: <span style={{ color: '#66FF66' }}>{networkState.speedTestData.server.sponsor}</span>
                              <br />
                            </>
                          )}
                          <small>
                            {networkState.speedTestData.server.distance && (
                              <>Distance: <span style={{ color: '#66FF66' }}>{networkState.speedTestData.server.distance}</span> • </>
                            )}
                            Latency: <span style={{ color: '#66FF66' }}>{networkState.speedTestData.server.latency.toFixed(2)} ms</span>
                          </small>
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {networkState.speedTestCompleted && (
                <>
                  <div className="col-lg-6 px-3 fade-in delay-1"> {/* Added fade-in animation */}
                    <div className="card border-0 shadow-lg h-100" style={{ backgroundColor: '#121212' }}>
                      <div className="card-body">
                        <h5 className="card-title mb-3" style={{ color: '#00FF00' }}>
                          <i className="fas fa-chart-line me-2"></i>
                          Connection Quality
                        </h5>

                        <ConnectionQualityMonitor
                          ping={networkData?.ping || 0}
                          jitter={networkData?.jitter || 0}
                          packetLoss={networkData?.packetLoss || 0}
                          stability={networkData?.stability || 0}
                          latencyHistory={latencyHistory}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="col-lg-6 px-3 fade-in delay-2"> {/* Added fade-in animation */}
                    <div className="card border-0 shadow-lg h-100" style={{ backgroundColor: '#121212' }}>
                      <div className="card-body">
                        <h5 className="card-title mb-3" style={{ color: '#00FF00' }}>
                          <i className="fas fa-network-wired me-2"></i>
                          Network Performance
                        </h5>

                        <ul className="list-group list-group-flush">
                          <li className="list-group-item d-flex justify-content-between align-items-center"
                            style={{
                              backgroundColor: '#1a1a1a',
                              borderColor: '#333333',
                              borderWidth: '0',
                              padding: '15px 12px',
                              marginBottom: '8px'
                            }}>
                            <span style={{ color: '#00FF00', fontSize: '1.2rem', fontWeight: 'bold' }}>
                              <i className={`fas ${networkData?.connectionType === "Wi-Fi" ? "fa-wifi" : "fa-ethernet"} me-2`}></i>
                              Connection Type
                            </span>
                            <span style={{ color: '#FFFFFF', fontSize: '1.2rem', fontWeight: 'bold' }}>
                              {networkData?.connectionType === "Wi-Fi" ?
                                "Wi-Fi" :
                                networkData?.connectionType === "Ethernet" ?
                                  "Ethernet" : "Unknown"}
                              <div style={{ color: '#CCCCCC', fontSize: '0.85rem', textAlign: 'right', marginTop: '2px' }}>
                                {networkData?.connectionType === "Ethernet" ?
                                  "Wired Connection" :
                                  "Wireless Connection"}
                              </div>
                            </span>
                          </li>
                          <li className="list-group-item d-flex justify-content-between align-items-center border-secondary "
                            style={{ backgroundColor: '#121212', borderColor: '#333333', borderWidth: '0' }}>
                            <span style={{ color: '#CCCCCC' }}>
                              <i className="fas fa-stopwatch me-2"></i>
                              Current Ping
                            </span>
                            <span style={{ color: '#00FF00' }}>{networkData?.ping || 0} <small style={{ color: '#CCCCCC' }}>ms</small></span>
                          </li>
                          {networkState.speedTestData && (
                            <li className="list-group-item d-flex justify-content-between align-items-center"
                              style={{ backgroundColor: '#121212', borderColor: '#333333', borderWidth: '0' }}>
                              <span style={{ color: '#66FF66' }}>
                                <i className="fas fa-tachometer-alt me-2"></i>
                                Speed Test Ping
                              </span>
                              <span style={{ color: '#00FF00' }}>{networkState.speedTestData.ping} ms</span>
                            </li>
                          )}
                          <li className="list-group-item d-flex justify-content-between align-items-center"
                            style={{ backgroundColor: '#121212', borderColor: '#333333', borderWidth: '0' }}>
                            <span style={{ color: '#CCCCCC' }}>
                              <i className="fas fa-random me-2"></i>
                              Jitter
                            </span>
                            <span style={{ color: '#00FF00' }}>{networkData?.jitter || 0} <small style={{ color: '#CCCCCC' }}>ms</small></span>
                          </li>
                          <li className="list-group-item d-flex justify-content-between align-items-center"
                            style={{ backgroundColor: '#121212', borderColor: '#333333', borderWidth: '0' }}>
                            <span style={{ color: '#CCCCCC' }}>
                              <i className="fas fa-exclamation-triangle me-2"></i>
                              Packet Loss
                            </span>
                            <span style={{ color: networkData?.packetLoss === 0 ? '#00FF00' : '#FFCC00' }}>
                              {networkData?.packetLoss || 0}%
                            </span>
                          </li>
                          <li className="list-group-item d-flex justify-content-between align-items-center"
                            style={{ backgroundColor: '#121212', borderColor: '#333333', borderWidth: '0' }}>
                            <span style={{ color: '#CCCCCC' }}>
                              <i className="fas fa-globe me-2"></i>
                              IP Address
                            </span>
                            <span style={{ color: '#00FF00' }}>{formatIP(networkData?.ipAddress)}</span>
                          </li>
                          <li className="list-group-item d-flex justify-content-between align-items-center"
                            style={{ backgroundColor: '#121212', borderColor: '#333333', borderWidth: '0' }}>
                            <span style={{ color: '#CCCCCC' }}>
                              <i className="fas fa-server me-2"></i>
                              DNS Server
                            </span>
                            <span style={{ color: '#00FF00' }}>{formatIP(networkData?.dnsServer)}</span>
                          </li>
                          <li className="list-group-item d-flex justify-content-between align-items-center"
                            style={{ backgroundColor: '#121212', borderColor: '#333333', borderWidth: '0' }}>
                            <span style={{ color: '#CCCCCC' }}>
                              <i className="fas fa-microchip me-2"></i>
                              MAC Address
                            </span>
                            <span style={{ color: '#00FF00' }}>{networkData?.macAddress || "Not available"}</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="col-12 px-3 fade-in delay-3"> {/* Added fade-in animation */}
                    <div className="card border-0 shadow-lg" style={{ backgroundColor: '#121212' }}>
                      {ioData && (
                        <IOMonitor
                          uploadSpeed={ioData.uploadSpeed}
                          downloadSpeed={ioData.downloadSpeed}
                          uploadPackets={ioData.uploadPackets}
                          downloadPackets={ioData.downloadPackets}
                          activeInterfaces={ioData.activeInterfaces}
                          bytesSent={ioData.bytesSent}
                          bytesReceived={ioData.bytesReceived}
                        />
                      )}
                    </div>
                  </div>

                  <div className="col-12 px-3 fade-in delay-3"> {/* Added fade-in animation */}
                    <div className="card border-0 shadow-lg" style={{ backgroundColor: '#121212' }}>
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <h5 className="card-title mb-0" style={{ color: '#00FF00' }}>
                            <i className="fas fa-chart-area me-2"></i>
                            Bandwidth Usage
                          </h5>
                          <div className="time-range-buttons">
                            <button
                              className={`btn btn-sm me-2 ${timeRange === '5min' ? 'active' : ''}`}
                              style={{
                                backgroundColor: timeRange === '5min' ? '#00FF00' : 'transparent',
                                color: timeRange === '5min' ? '#000000' : '#CCCCCC',
                                border: timeRange === '5min' ? 'none' : '1px solid #333333'
                              }}
                              onClick={() => handleTimeRangeChange('5min')}
                            >
                              5 Min
                            </button>
                            <button
                              className={`btn btn-sm me-2 ${timeRange === '1hour' ? 'active' : ''}`}
                              style={{
                                backgroundColor: timeRange === '1hour' ? '#00FF00' : 'transparent',
                                color: timeRange === '1hour' ? '#000000' : '#CCCCCC',
                                border: timeRange === '1hour' ? 'none' : '1px solid #333333'
                              }}
                              onClick={() => handleTimeRangeChange('1hour')}
                            >
                              1 Hour
                            </button>
                            <button
                              className={`btn btn-sm ${timeRange === '1day' ? 'active' : ''}`}
                              style={{
                                backgroundColor: timeRange === '1day' ? '#00FF00' : 'transparent',
                                color: timeRange === '1day' ? '#000000' : '#CCCCCC',
                                border: timeRange === '1day' ? 'none' : '1px solid #333333'
                              }}
                              onClick={() => handleTimeRangeChange('1day')}
                            >
                              1 Day
                            </button>
                          </div>
                        </div>
                        {bandwidthHistory.length > 0 ? (
                          <BandwidthUsageGraph bandwidthHistory={bandwidthHistory} timeRange={timeRange} />
                        ) : (
                          <div className="text-center py-5" style={{ color: '#CCCCCC' }}>
                            <i className="fas fa-chart-area mb-3" style={{ fontSize: '2rem' }}></i>
                            <p>
                              {networkState.speedTestCompleted ?
                                "No bandwidth data available yet. Data will appear as your connection is monitored." :
                                "Run a speed test to start collecting bandwidth history data."}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="footer text-center py-3 mt-auto" style={{ color: '#CCCCCC' }}>
        <i className="fas fa-clock me-2"></i>
        Last updated: {lastUpdated ? lastUpdated.toLocaleTimeString() : "Never"}
        <span className="ms-2">
          {lastUpdated && `(${Math.round((Date.now() - lastUpdated.getTime()) / 1000)}s ago)`}
        </span>
      </div>
    </div>
  )
}

export default Network

