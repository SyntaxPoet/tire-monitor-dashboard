# 🛞 Tire Monitor

A comprehensive tire monitoring application that uses AI-powered image analysis to track tire health, detect wear patterns, and provide predictive maintenance insights.

## ✨ Features

### 🚗 **Vehicle Management**
- Add multiple vehicles to your dashboard
- Track tire positions (Front Left, Front Right, Rear Left, Rear Right)
- Store vehicle details (make, model, year)

### 📷 **Smart Camera Integration**
- Real-time camera capture for tire photos
- Mobile-responsive camera interface
- Automatic photo processing and analysis

### 🤖 **AI-Powered Analysis**
- **Tread Depth Measurement**: Automatic calculation of remaining tread life
- **Wear Pattern Detection**: Identify uneven wear and alignment issues
- **Sidewall Condition Analysis**: Monitor for cracks, bulges, and damage
- **Health Scoring**: Overall tire health percentage based on multiple factors

### 📊 **Interactive Dashboard**
- Real-time statistics (vehicles, tires, photos, alerts)
- Health trend charts with historical data
- Recent activity feed with photo thumbnails
- KPI tracking with trend analysis

### 💾 **Local Data Storage**
- SQLite database for robust local storage
- File system storage for tire photos
- No external dependencies required for development

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- A modern web browser with camera access
- (Optional) Docker Desktop for advanced deployment

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/tire-monitor.git
   cd tire-monitor
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up the database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📱 Usage Guide

### Adding Your First Vehicle
1. Click the **"Add Vehicle"** button on the dashboard
2. Enter vehicle details (name, make, model, year)
3. The system automatically creates 4 tire positions

### Taking Tire Photos
1. Click any tire position button on a vehicle card
2. Allow camera access when prompted
3. Position your camera to capture the entire tire
4. Click **"Capture Photo"** to take the picture
5. Review and **"Use Photo"** to save

### Understanding the Dashboard
- **Vehicles**: Total number of vehicles being monitored
- **Tires**: Total tires across all vehicles (typically 4 per vehicle)
- **Photos Today**: Number of photos taken in the current day
- **Alerts**: Number of tires requiring attention

### Reading Health Charts
- **Blue Line**: Overall tire health percentage
- **Green Line**: Tread depth in millimeters
- **Yellow Line**: Sidewall condition percentage
- Hover over data points for detailed measurements

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Database**: SQLite with Prisma ORM
- **Image Processing**: Sharp for image analysis
- **Charts**: Recharts for data visualization

### Project Structure
```
tire-monitor/
├── src/
│   ├── app/
│   │   ├── api/           # API routes
│   │   ├── globals.css    # Global styles
│   │   └── page.tsx       # Main dashboard
│   ├── components/
│   │   ├── ui/           # Reusable UI components
│   │   ├── camera/       # Camera functionality
│   │   └── dashboard/    # Dashboard components
│   ├── lib/
│   │   ├── db.ts         # Database connection
│   │   └── utils.ts      # Utility functions
│   └── utils/            # File handling utilities
├── prisma/
│   └── schema.prisma     # Database schema
└── public/               # Static assets
```

### Database Schema

#### Core Models
- **Vehicle**: Stores vehicle information
- **Tire**: Individual tire positions linked to vehicles
- **TirePhoto**: Photos of tires with metadata
- **Measurement**: Analysis results from photos
- **KPI**: Calculated health metrics and trends

## 🔧 API Reference

### Vehicles
- `GET /api/vehicles` - List all vehicles with tires
- `POST /api/vehicles` - Create new vehicle

### Photos
- `GET /api/photos?tireId={id}` - Get photos for a tire
- `POST /api/photos` - Upload new photo

### Processing
- `POST /api/process` - Analyze uploaded photo

### KPIs
- `GET /api/kpis?tireId={id}` - Get KPIs for a tire
- `POST /api/kpis` - Recalculate KPIs

### Measurements
- `GET /api/measurements?tireId={id}` - Get measurements for a tire

## 🎯 Key Features Deep Dive

### Image Analysis Pipeline
1. **Photo Capture**: High-quality camera integration
2. **Preprocessing**: Image optimization and enhancement
3. **Feature Extraction**: Tread pattern and sidewall analysis
4. **Measurement Calculation**: Automated metric extraction
5. **KPI Generation**: Health scoring and trend analysis

### Health Scoring Algorithm
```
Overall Health = (Tread Health × 50%) + (Sidewall Health × 30%) + (Wear Pattern × 20%)

Where:
- Tread Health = (Current Depth / New Tire Depth) × 100%
- Sidewall Health = Visual inspection score (0-100%)
- Wear Pattern = Uniformity score (0-100%)
```

### Trend Analysis
- **Improving**: Health score increasing over time
- **Stable**: Consistent health scores
- **Declining**: Health score decreasing (requires attention)

## 🚀 Deployment

### Local Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Docker Deployment (Optional)
```bash
docker build -t tire-monitor .
docker run -p 3000:3000 tire-monitor
```

## 🔮 Future Enhancements

### Planned Features
- [ ] **Advanced Computer Vision**: Integration with TensorFlow.js for better analysis
- [ ] **Pressure Monitoring**: Tire pressure sensor integration
- [ ] **Maintenance Scheduling**: Automated service reminders
- [ ] **Weather Integration**: Impact analysis based on driving conditions
- [ ] **Multi-User Support**: User authentication and data sharing
- [ ] **Mobile App**: React Native companion app
- [ ] **Cloud Sync**: Optional cloud backup and synchronization

### Technical Improvements
- [ ] **Real ML Models**: Custom-trained models for tire analysis
- [ ] **Progressive Web App**: Offline functionality
- [ ] **Advanced Analytics**: Predictive maintenance algorithms
- [ ] **Integration APIs**: OBD-II and vehicle diagnostic data

## 📄 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🐛 Troubleshooting

### Camera Issues
- Ensure camera permissions are granted
- Try refreshing the page
- Check browser compatibility (Chrome, Firefox, Safari)

### Database Issues
- Run `npx prisma db push` to sync schema
- Check `prisma/dev.db` file exists
- Restart development server

### Image Processing Errors
- Ensure Sharp package is installed
- Check file upload permissions
- Verify image format compatibility

## 📞 Support

For questions, issues, or contributions:
- Open an issue on GitHub
- Check the troubleshooting section
- Review the API documentation

---

**Happy Tire Monitoring!** 🛞✨