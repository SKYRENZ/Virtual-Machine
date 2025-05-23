"use client"

import type React from "react"

import { useState, useEffect } from "react"
import "./custom.css"
import SpeedTestNotification from "../components/SpeedTestNotification"
import PowerConsumptionGraph from "../components/PowerConsumptionGraph"

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

interface BatteryProps {
  networkState?: {
    speedTestCompleted: boolean
    speedTestData: SpeedTestResult | null
    isRunningSpeedTest: boolean
    scanProgress: number
    currentPhase: string
    error: string | null
    dataReady: boolean
  }
}

export const Battery = ({ networkState }: BatteryProps) => {
  const [batteryLevel, setBatteryLevel] = useState(75)
  const [isCharging, setIsCharging] = useState(false)
  const [batteryTimeLeft, setBatteryTimeLeft] = useState(300)
  const [isGamingMode, setIsGamingMode] = useState(false)

  interface BatteryData {
    charging_status?: boolean
    system_power_usage?: number
    battery_discharge_rate?: number
    system_uptime?: string
  }

  const [batteryData, setBatteryData] = useState<BatteryData>({})

  // Check gaming mode status
  useEffect(() => {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000"
    const apiUrl = `${API_BASE_URL}/gaming-mode`

    const fetchGamingModeStatus = async () => {
      try {
        const response = await fetch(`${apiUrl}/status`)
        if (response.ok) {
          const data = await response.json()
          setIsGamingMode(data.gaming_mode)
        }
      } catch (err) {
        console.error("Failed to fetch gaming mode status:", err)
      }
    }

    fetchGamingModeStatus()
    const interval = setInterval(fetchGamingModeStatus, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const fetchBatteryData = async () => {
      try {
        const response = await fetch("http://127.0.0.1:5000/battery") // Port updated to 5000
        const data = await response.json()

        setBatteryLevel(data.battery_level)
        setIsCharging(data.is_charging)
        setBatteryTimeLeft(data.time_left)
        setBatteryData(data) // Save the full battery data to state
      } catch (error) {
        console.error("Error fetching battery data:", error)
      }
    }

    fetchBatteryData()
    const interval = setInterval(fetchBatteryData, 2000)
    return () => clearInterval(interval)
  }, [])

  const getBatteryColor = () => {
    if (isGamingMode) return "url(#rgbGradient)" // Use RGB gradient in gaming mode
    if (batteryLevel > 60) return "#00ff00"
    if (batteryLevel > 20) return "#ffaa00"
    return "#ff0000"
  }

  const [selectedMode, setSelectedMode] = useState("Select Power Mode")

  const handleModeChange = async (mode: string) => {
    setSelectedMode(mode)

    try {
      const response = await fetch("http://localhost:5000/set_power_plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan: mode }),
      })

      const data = await response.json()

      if (response.ok) {
        console.log(`${data.message}`)
      } else {
        console.error("Server Error:", data.error)
      }
    } catch (error) {
      console.error("Network Error:", error)
    }
  }

  const getIconForMode = (mode: string) => {
    switch (mode) {
      case "High Performance":
        return "fas fa-rocket text-danger"
      case "Balanced":
        return "fas fa-balance-scale text-warning"
      case "Power Saver":
        return "fas fa-leaf text-success"
      default:
        return "fas fa-bolt"
    }
  }

  const dropdownItemStyle: React.CSSProperties = {
    color: "#CCCCCC",
    padding: "0.5rem 1rem",
    transition: "all 0.3s ease",
    cursor: "pointer",
  }

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = "scale(1.02)"
    e.currentTarget.style.backgroundColor = "rgba(0, 255, 0, 0.1)"
    e.currentTarget.style.color = "#00FF00"
  }

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = "scale(1)"
    e.currentTarget.style.backgroundColor = "transparent"
    e.currentTarget.style.color = "#CCCCCC"
  }

  return (
    <div
      className={`text-[#cccccc] font-[Arial] vh-100 vw-100 flex flex-col items-center overflow-y-auto overflow-x-hidden ${isGamingMode ? "gaming-mode-dashboard" : ""}`}
    >
      {/* RGB Gradient Definition for Gaming Mode */}
      <svg style={{ position: "absolute", width: 0, height: 0 }}>
        <defs>
          <linearGradient id="rgbGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ff0000">
              <animate
                attributeName="stop-color"
                values="#ff0000; #ffff00; #00ff00; #00ffff; #0000ff; #ff00ff; #ff0000"
                dur="5s"
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="100%" stopColor="#ff00ff">
              <animate
                attributeName="stop-color"
                values="#ff00ff; #ff0000; #ffff00; #00ff00; #00ffff; #0000ff; #ff00ff"
                dur="5s"
                repeatCount="indefinite"
              />
            </stop>
          </linearGradient>
        </defs>
      </svg>

      {/* Dashboard Header */}
      <div className="flex flex-row justify-between align-items-center w-full bg-[#ffffff]">
        <div
          className="dashboard-header d-flex justify-content-between align-items-center p-3"
          style={{
            backgroundColor: "#121212",
            width: "100%",
            height: "10vh",
            borderBottom: isGamingMode ? "1px solid #00aaff" : "1px solid #333",
          }}
        >
          <h1 className="m-0 fs-4" style={{ color: isGamingMode ? "#00aaff" : "#ffffff" }}>
            BATTERY MONITOR
          </h1>

          <div className="dropdown me-3" style={{ position: "relative", zIndex: 1 }}>
            <button
              className="btn dropdown-toggle"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
              style={{
                backgroundColor: "transparent",
                border: isGamingMode ? "1px solid #00aaff" : "1px solid #00FF00",
                color: isGamingMode ? "#00aaff" : "#00FF00",
                padding: "0.5rem 1rem",
                minWidth: "180px",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.05)"
                e.currentTarget.style.backgroundColor = isGamingMode ? "rgba(0, 170, 255, 0.1)" : "rgba(0, 255, 0, 0.1)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)"
                e.currentTarget.style.backgroundColor = "transparent"
              }}
            >
              <i className="fas fa-bolt me-2"></i>
              {selectedMode}
            </button>
            <ul
              className="dropdown-menu dropdown-menu-end"
              style={{
                backgroundColor: "#1a1a1a",
                border: "1px solid #333",
                minWidth: "200px",
              }}
            >
              {["High Performance", "Balanced", "Power Saver"].map((mode) => (
                <li key={mode}>
                  <button
                    className="dropdown-item d-flex align-items-center"
                    style={dropdownItemStyle}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => handleModeChange(mode)}
                  >
                    <i className={`me-2 ${getIconForMode(mode)}`}></i>
                    {mode}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      {/* Giant Battery Visualization */}
      <div
        className="battery-visualization d-flex justify-content-center align-items-center mt-5"
        style={{ height: "45vh", width: "90%", padding: 0, margin: "0 Auto" }}
      >
        <div
          className={`battery-container position-relative rgb-border-container ${isGamingMode ? "active" : ""}`}
          style={{ width: "90%", height: "100%" }}
        >
          <div
            className="battery-body border border-4 border-light rounded position-relative"
            style={{ width: "100%", height: "100%", overflow: "hidden" }}
          >
            <div
              className={`battery-level ${isGamingMode ? "rgb-needle" : ""}`}
              style={{
                width: `${batteryLevel}%`,
                height: "100%",
                backgroundColor: getBatteryColor(),
                transition: "width 1s ease, background-color 1s ease",
              }}
            ></div>
            <div
              className="battery-percentage position-absolute top-50 start-50 translate-middle fw-bold text-white"
              style={{ fontSize: "10vw", textShadow: "0 0 10px rgba(0,0,0,0.7)" }}
            >
              {batteryLevel}%
            </div>
          </div>

          {/* 🔧 Fixed Battery Cap Position */}
          <div
            className="battery-cap position-absolute"
            style={{
              right: "-8px" /* Adjusted so it's visible */,
              top: "40%",
              width: "12px",
              height: "20%",
              backgroundColor: isGamingMode ? "#00aaff" : "#aaa",
              borderTopRightRadius: "6px",
              borderBottomRightRadius: "6px",
            }}
          ></div>

          {isCharging && (
            <div className="charging-indicator position-absolute" style={{ top: "30%", right: "10%", fontSize: "8vw" }}>
              <span className={`${isGamingMode ? "rgb-needle" : "text-warning"}`}>⚡</span>
            </div>
          )}
        </div>
      </div>

      {/* Battery Status */}
      <div className="battery-status mt-4 text-center">
        <h2
          className="mb-2"
          style={{
            fontSize: "3vw",
            color: isGamingMode ? "url(#rgbGradient)" : isCharging ? "#00ff00" : "#ff0000",
            WebkitBackgroundClip: isGamingMode ? "text" : "unset",
            WebkitTextFillColor: isGamingMode ? "#00aaff" : "unset",
          }}
        >
          {isCharging ? "CHARGING" : "UNPLUGGED"}
        </h2>
        <p className="text-muted mb-0" style={{ fontSize: "1.5vw" }}>
          {isCharging
            ? `Approximately ${100 - batteryLevel} minutes until fully charged`
            : `Approximately ${batteryLevel * 5} minutes remaining`}
        </p>
      </div>

      {/* Battery Info */}
      <div style={{ height: "50vh", display: "flex", justifyContent: "center",width: "90%", margin: "0 auto" }}>
        <div
          className={`battery-info mt-5 text-center rgb-border-container ${isGamingMode ? "active" : ""}`}
          style={{ backgroundColor: "#121212", width: "90%", height: "40vh", padding: "2rem", borderRadius: "8px" }}
        >
          <div
            className="info-row flex justify-between"
            style={{
              display: "flex",
              marginBottom: "1rem",
              fontSize: "2vw",
              color: isGamingMode ? "#00aaff" : "#00ff00",
            }}
          >
            <div style={{ flex: 1, textAlign: "left" }}>
              <strong>Battery Information</strong>
            </div>
          </div>
          <div
            className="info-row flex justify-between"
            style={{ display: "flex", marginBottom: "1rem", fontSize: "1.5vw" }}
          >
            <div style={{ flex: 1, textAlign: "left", color: "#cccccc" }}>
              <strong>Charging Status:</strong>
            </div>
            <div style={{ flex: 1, textAlign: "right", color: isGamingMode ? "#00aaff" : "#00ff00" }}>
              {batteryData.charging_status ? "Charging" : "Not Charging"}
            </div>
          </div>
          <div
            className="info-row flex justify-between"
            style={{ display: "flex", marginBottom: "1rem", fontSize: "1.5vw" }}
          >
            <div style={{ flex: 1, textAlign: "left", color: "#cccccc" }}>
              <strong>Power Usage (W):</strong>
            </div>
            <div style={{ flex: 1, textAlign: "right", color: isGamingMode ? "#00aaff" : "#00ff00" }}>
              {batteryData.system_power_usage} W
            </div>
          </div>
          <div
            className="info-row flex justify-between"
            style={{ display: "flex", marginBottom: "1rem", fontSize: "1.5vw" }}
          >
            <div style={{ flex: 1, textAlign: "left", color: "#cccccc" }}>
              <strong>Discharge Rate (W):</strong>
            </div>
            <div style={{ flex: 1, textAlign: "right", color: isGamingMode ? "#00aaff" : "#00ff00" }}>
              {batteryData.battery_discharge_rate} W
            </div>
          </div>
          <div
            className="info-row flex justify-between"
            style={{ display: "flex", marginBottom: "1rem", fontSize: "1.5vw" }}
          >
            <div style={{ flex: 1, textAlign: "left", color: "#cccccc" }}>
              <strong>System Uptime:</strong>
            </div>
            <div style={{ flex: 1, textAlign: "right", color: isGamingMode ? "#00aaff" : "#00ff00" }}>
              {batteryData.system_uptime}
            </div>
          </div>
        </div>
      </div>

      <div className=" flex justify-center mt-6 mb-5" style={{ width: "90%", margin: "0 auto" }}>
        <div
          className={`max-w-5xl bg-[#1e1e1e] rounded-lg shadow-lg rgb-border-container ${isGamingMode ? "active" : ""}`}
          style={{ height: "65vh" }}
        >
          <h2 className="text-xl mb-4" style={{color: isGamingMode ? "#00aaff" : "#00FF00" }}>
            Power Consumption History
          </h2>
          <PowerConsumptionGraph />
        </div>
      </div>

      {/* Speed Test Notification */}
      {networkState && (
        <div className={`network-state-container ${isGamingMode ? "rgb-border" : ""}`}>
          <SpeedTestNotification networkState={networkState} />
        </div>
      )}
    </div>
  )
}

export default Battery
