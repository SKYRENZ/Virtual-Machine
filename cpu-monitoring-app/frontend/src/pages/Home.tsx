"use client"

import { useState, useEffect } from "react"
import { PieChart, Pie, Cell } from "recharts"
import "bootstrap/dist/css/bootstrap.min.css"
import "./custom.css" // For custom styling on top of Bootstrap

const RADIAN = Math.PI / 180
const cx = 150
const cy = 150
const iR = 100
const oR = 140
const segments = 10

// Updated color scheme to green
const generateColor = (index: number) => {
  const startColor = [0, 255, 0] // Bright green
  const endColor = [0, 100, 0] // Dark green
  const r = Math.round(startColor[0] + ((endColor[0] - startColor[0]) * index) / (segments - 1))
  const g = Math.round(startColor[1] + ((endColor[1] - startColor[1]) * index) / (segments - 1))
  const b = Math.round(startColor[2] + ((endColor[2] - startColor[2]) * index) / (segments - 1))
  return `rgb(${r},${g},${b})`
}

const generateData = () =>
  Array.from({ length: segments }, (_, i) => ({
    name: `Segment ${i + 1}`,
    value: 100 / segments,
    color: generateColor(i),
  }))

const needle = (value: number, cx: number, cy: number, iR: number, oR: number, color: string | undefined) => {
  const ang = 180 - (value * 180) / 100
  const length = (iR + 2 * oR) / 3
  const sin = Math.sin(-RADIAN * ang)
  const cos = Math.cos(-RADIAN * ang)
  const r = 5
  const x0 = cx
  const y0 = cy
  const xba = x0 + r * sin
  const yba = y0 - r * cos
  const xbb = x0 - r * sin
  const ybb = y0 + r * cos
  const xp = x0 + length * cos
  const yp = y0 + length * sin

  return [
    <circle cx={x0} cy={y0} r={r} fill={color} stroke="none" key="needle-circle" />,
    <path
      d={`M${xba} ${yba}L${xbb} ${ybb} L${xp} ${yp} L${xba} ${yba}`}
      stroke="none"
      fill={color}
      key="needle-path"
    />,
  ]
}

interface GaugeChartProps {
  title: string
  value: number
}

const GaugeChart = ({ title, value }: GaugeChartProps) => (
  <div className="card bg-dark text-white mb-4 gauge-card">
    <div className="card-body text-center">
      <h5 className="card-title">{title}</h5>
      <div className="gauge-chart">
        <PieChart width={300} height={300}>
          <Pie
            dataKey="value"
            startAngle={180}
            endAngle={0}
            data={generateData()}
            cx={cx}
            cy={cy}
            innerRadius={iR}
            outerRadius={oR}
            stroke="none"
          >
            {generateData().map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          {needle(value, cx, cy, iR, oR, "#00ff00")}
          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" className="gauge-value">
            {value}
          </text>
          <text x={cx} y={cy + 30} textAnchor="middle" dominantBaseline="middle" className="gauge-percent">
            %
          </text>
        </PieChart>
      </div>
    </div>
  </div>
)

const UsageBar = ({ title, value, color = "#00ff00" }: { title: string; value: number; color?: string }) => {
  return (
    <div className="card bg-dark text-white mb-3">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h5 className="card-title mb-0">{title}</h5>
          <span className="usage-value">
            {value}
            <span className="text-success">%</span>
          </span>
        </div>
        <div className="progress bg-secondary">
          <div
            className="progress-bar"
            role="progressbar"
            style={{
              width: `${value}%`,
              backgroundColor: color,
            }}
            aria-valuenow={value}
            aria-valuemin={0}
            aria-valuemax={100}
          ></div>
        </div>
      </div>
    </div>
  )
}

const TemperatureBar = () => {
  const [temperature, setTemperature] = useState(50)
  const [isUsingMockData, setIsUsingMockData] = useState(false)

  // API endpoint configuration
  const API_URL = "http://127.0.0.1:5000/cpu-temperature"

  useEffect(() => {
    const generateMockTemperature = () => {
      const baseTemp = 45
      const randomVariation = Math.floor(Math.random() * 30)
      return baseTemp + randomVariation
    }

    const fetchTemperature = async () => {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 2000)

        const response = await fetch(API_URL, {
          signal: controller.signal,
          headers: {
            Accept: "application/json",
          },
        })
        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`)
        }

        const data = await response.json()

        if (data.temperature !== undefined) {
          setTemperature(data.temperature)
          setIsUsingMockData(false)
        } else if (data.error) {
          throw new Error(data.error)
        }
      } catch (error) {
        console.log("Using mock temperature data")
        setIsUsingMockData(true)
        setTemperature(generateMockTemperature())
      }
    }

    fetchTemperature()

    const interval = setInterval(() => {
      if (isUsingMockData) {
        setTemperature(generateMockTemperature())
      } else {
        fetchTemperature()
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [isUsingMockData, API_URL])

  return (
    <div className="card bg-dark text-white">
      <div className="card-body">
        <h5 className="card-title mb-3">
          Temperature {isUsingMockData && <span className="badge bg-warning text-dark">Mock</span>}
        </h5>
        <ul className="list-group list-group-flush">
          <li className="list-group-item d-flex justify-content-between align-items-center bg-dark text-white border-secondary">
            <span>CPU Temperature</span>
            <span className="text-success">{temperature} °C</span>
          </li>
          <li className="list-group-item d-flex justify-content-between align-items-center bg-dark text-white border-secondary">
            <span>GPU Temperature</span>
            <span className="text-success">{Math.floor(temperature * 0.9)} °C</span>
          </li>
          <li className="list-group-item d-flex justify-content-between align-items-center bg-dark text-white border-secondary">
            <span>GPU Clock</span>
            <span className="text-success">1250 MHz</span>
          </li>
          <li className="list-group-item d-flex justify-content-between align-items-center bg-dark text-white border-secondary">
            <span>VRAM Clock</span>
            <span className="text-success">6000 MHz</span>
          </li>
        </ul>
      </div>
    </div>
  )
}

const SystemSpecs = () => (
  <div className="card bg-dark text-white mb-4">
    <div className="card-body">
      <h5 className="card-title mb-3">System Specifications</h5>
      <ul className="list-group list-group-flush">
        <li className="list-group-item d-flex justify-content-between align-items-center bg-dark text-white border-secondary">
          <span>CPU</span>
          <span className="text-success">AMD Ryzen 7 5800X</span>
        </li>
        <li className="list-group-item d-flex justify-content-between align-items-center bg-dark text-white border-secondary">
          <span>GPU</span>
          <span className="text-success">NVIDIA RTX 3070</span>
        </li>
        <li className="list-group-item d-flex justify-content-between align-items-center bg-dark text-white border-secondary">
          <span>RAM</span>
          <span className="text-success">32 GB DDR4</span>
        </li>
        <li className="list-group-item d-flex justify-content-between align-items-center bg-dark text-white border-secondary">
          <span>Fan Speed</span>
          <span className="text-success">1200 RPM</span>
        </li>
      </ul>
    </div>
  </div>
)

const StorageInfo = () => (
  <div className="card bg-dark text-white">
    <div className="card-body">
      <h5 className="card-title mb-3">Storage & Network</h5>
      <ul className="list-group list-group-flush">
        <li className="list-group-item bg-dark text-white border-secondary">
          <div className="d-flex justify-content-between align-items-center mb-1">
            <span>SSD</span>
            <span className="text-success">650 GB / 1 TB</span>
          </div>
          <div className="progress bg-secondary">
            <div
              className="progress-bar bg-success"
              style={{ width: "65%" }}
              role="progressbar"
              aria-valuenow={65}
              aria-valuemin={0}
              aria-valuemax={100}
            ></div>
          </div>
        </li>
        <li className="list-group-item bg-dark text-white border-secondary">
          <div className="d-flex justify-content-between align-items-center mb-1">
            <span>HDD</span>
            <span className="text-success">1.2 TB / 3 TB</span>
          </div>
          <div className="progress bg-secondary">
            <div
              className="progress-bar bg-success"
              style={{ width: "40%" }}
              role="progressbar"
              aria-valuenow={40}
              aria-valuemin={0}
              aria-valuemax={100}
            ></div>
          </div>
        </li>
        <li className="list-group-item d-flex justify-content-between align-items-center bg-dark text-white border-secondary">
          <span>Network</span>
          <span className="text-success">1 Gbps</span>
        </li>
        <li className="list-group-item d-flex justify-content-between align-items-center bg-dark text-white border-secondary">
          <span>Power Plan</span>
          <span className="text-success">Performance</span>
        </li>
      </ul>
    </div>
  </div>
)

const Home = () => {
  const [cpuUsage, setCpuUsage] = useState(50)
  const [gpuUsage, setGpuUsage] = useState(30)
  const [memoryUsage, setMemoryUsage] = useState(65)
  const [diskUsage, setDiskUsage] = useState(45)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [cpuResponse, memoryResponse, diskResponse] = await Promise.all([
          fetch("http://127.0.0.1:5000/cpu-usage"),
          fetch("http://127.0.0.1:5000/memory-usage"),
          fetch("http://127.0.0.1:5000/disk-usage"),
        ])

        if (cpuResponse.ok) {
          const cpuData = await cpuResponse.json()
          setCpuUsage(cpuData.cpu_usage)
        }

        if (memoryResponse.ok) {
          const memoryData = await memoryResponse.json()
          setMemoryUsage(memoryData.memory_usage_percent)
        }

        if (diskResponse.ok) {
          const diskData = await diskResponse.json()
          setDiskUsage(diskData.disk_usage_percent)
        }
      } catch (error) {
        console.log("Error fetching data, using mock values", error)
        setCpuUsage(Math.floor(Math.random() * 101))
        setGpuUsage(Math.floor(Math.random() * 101))
        setMemoryUsage(Math.floor(Math.random() * 31) + 50) // 50-80% range
        setDiskUsage(Math.floor(Math.random() * 21) + 40) // 40-60% range
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="bg-black text-white min-vh-100">
      <div className="dashboard-header">
        <div className="container-fluid">
          <div className="row align-items-center">
            <div className="col-md-6">
              <h1 className="m-0">SYSTEM MONITOR</h1>
            </div>
            <div className="col-md-6">
              <div className="d-flex justify-content-md-end justify-content-start mt-3 mt-md-0">
                <div className="me-4">
                  <span className="me-2">Scenario:</span>
                  <select className="form-select form-select-sm bg-black text-success border-success">
                    <option>Balanced</option>
                    <option>Performance</option>
                    <option>Silent</option>
                  </select>
                </div>
                <div>
                  <span className="me-2">Gaming Mode:</span>
                  <select className="form-select form-select-sm bg-black text-success border-success">
                    <option>OFF</option>
                    <option>ON</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container-fluid py-4">
        <h2 className="section-title mb-4">Monitor</h2>

        <div className="row">
          <div className="col-lg-4 mb-4">
            <GaugeChart title="CPU Usage" value={cpuUsage} />
            <GaugeChart title="GPU Usage" value={gpuUsage} />
          </div>

          <div className="col-lg-4 mb-4">
            <UsageBar title="Disk" value={diskUsage} />
            <button className="btn btn-outline-success w-100 mb-4">Clean up the disk</button>

            <UsageBar title="Memory" value={memoryUsage} color="#00cc00" />
            <button className="btn btn-outline-success w-100 mb-4">Free up memory</button>
          </div>

          <div className="col-lg-4">
            <div className="row">
              <div className="col-12 mb-4">
                <SystemSpecs />
              </div>
              <div className="col-12 mb-4">
                <StorageInfo />
              </div>
              <div className="col-12">
                <TemperatureBar />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home

