# Road Safety Hub (AccidentIQ)

A comprehensive full-stack application for analyzing road accident data and predicting risk factors using machine learning. Built with modern web technologies and data science tools.

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Python](https://img.shields.io/badge/Python-3.8%2B-blue)
![React](https://img.shields.io/badge/React-18%2B-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0%2B-3178C6?logo=typescript)

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running the Application](#running-the-application)
- [Configuration](#configuration)
- [API Endpoints](#api-endpoints)
- [Contributing](#contributing)
- [License](#license)

## ✨ Features

- **User Authentication**: Secure login and registration system
- **Dataset Analysis**: Upload and analyze accident datasets with comprehensive statistics
- **Risk Prediction**: Machine learning models for predicting accident risk factors
- **Interactive Dashboard**: Real-time visualization of accident data and trends
- **Data Exploration**: Explore datasets with detailed analytics and patterns
- **Responsive UI**: Modern, mobile-friendly interface built with Shadcn UI
- **RESTful API**: CORS-enabled backend API for flexible integration
- **Export & Reports**: Generate insights from accident data analysis

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite
- **UI Components**: Shadcn UI + Radix UI
- **Styling**: Tailwind CSS
- **State Management**: React Context + React Query
- **Form Handling**: React Hook Form
- **Testing**: Vitest + Playwright

### Backend
- **Framework**: Flask
- **Language**: Python 3.8+
- **Database**: CSV-based data storage
- **Machine Learning**: XGBoost, Scikit-learn
- **API**: RESTful with CORS support
- **File Upload**: Werkzeug
- **Data Processing**: Pandas, NumPy

### Data & Analytics
- **Data Analysis**: Pandas, NumPy
- **Visualization**: Chart.js, custom analytics
- **ML Model**: XGBoost for risk prediction
- **Dataset Format**: CSV

## 📁 Project Structure

```
road-safety-hub/
├── src/                           # React frontend
│   ├── components/
│   │   ├── AppLayout.tsx
│   │   ├── AppSidebar.tsx
│   │   └── ui/                   # Shadcn UI components
│   ├── pages/
│   │   ├── Dashboard.tsx         # Main analytics dashboard
│   │   ├── DatasetPage.tsx       # Dataset management & analysis
│   │   ├── AnalyzerPage.tsx      # Advanced analysis tools
│   │   ├── AboutPage.tsx
│   │   └── Index.tsx             # Home page
│   ├── contexts/                 # React Context providers
│   ├── hooks/                    # Custom React hooks
│   ├── lib/                      # Utility functions
│   └── main.tsx
│
├── flask-project/                # Flask backend
│   ├── app.py                    # Main Flask application
│   ├── train_model.py            # ML model training script
│   ├── requirements.txt          # Python dependencies
│   ├── templates/                # HTML templates
│   ├── static/                   # Static assets (CSS, images)
│   └── data/                     # Data storage
│
├── AccidentIQ/                   # Data science module
│   ├── config.py                 # Configuration settings
│   ├── services/
│   │   ├── dataset_analyzer.py   # Data analysis utilities
│   │   └── risk_engine.py        # Risk prediction engine
│   ├── utils/
│   │   └── helpers.py            # Helper functions
│   └── data/
│       ├── accident_final.csv    # Sample accident dataset
│       └── users.csv            # User data
│
├── vite.config.ts                # Vite configuration
├── tailwind.config.ts            # Tailwind CSS configuration
├── tsconfig.json                 # TypeScript configuration
├── package.json                  # Node.js dependencies
└── README.md
```

## 📦 Prerequisites

- **Node.js**: v16 or higher (with npm or yarn)
- **Python**: 3.8 or higher
- **pip**: Python package manager
- **Git**: For version control

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/road-safety-hub.git
cd road-safety-hub
```

### 2. Frontend Setup

```bash
# Install Node dependencies
npm install
# or
yarn install
```

### 3. Backend Setup

```bash
cd flask-project

# Create a virtual environment (optional but recommended)
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt
```

## 🎯 Running the Application

### Development Mode

**Terminal 1 - Start Frontend (from root directory):**
```bash
npm run dev
```
The frontend will be available at `http://localhost:5173`

**Terminal 2 - Start Backend (from flask-project directory):**
```bash
python app.py
```
The Flask API will run on `http://localhost:5000`

### Production Build

**Frontend:**
```bash
npm run build
npm run preview
```

**Backend:**
Configure environment variables and run with a production WSGI server:
```bash
pip install gunicorn
gunicorn -w 4 app:app
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the `flask-project` directory:

```env
FLASK_ENV=development
FLASK_DEBUG=True
SECRET_KEY=your-secret-key-here
UPLOAD_FOLDER=data
MAX_CONTENT_LENGTH=16777216
```

### Key Configuration Files

- **Frontend**: `vite.config.ts`, `tailwind.config.ts`, `tsconfig.json`
- **Backend**: `AccidentIQ/config.py`, `flask-project/app.py`

## 🔌 API Endpoints

### Authentication
- `POST /api/login` - User login
- `POST /api/register` - User registration
- `GET /api/logout` - User logout

### Dataset
- `GET /api/dataset` - Get dataset information
- `POST /api/upload` - Upload new dataset
- `GET /api/dataset/columns` - Get column statistics
- `GET /api/dataset/summary` - Get data summary

### Analysis
- `GET /api/analysis/risk` - Get risk factors analysis
- `POST /api/predict` - Predict accident risk
- `GET /api/statistics` - Get statistical analysis

## 🧪 Testing

### Frontend Tests
```bash
npm run test          # Run tests once
npm run test:watch    # Run tests in watch mode
```

### Linting
```bash
npm run lint
```

## 📝 Development Workflow

1. Create a new branch for your feature
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and commit
   ```bash
   git add .
   git commit -m "Add your feature description"
   ```

3. Push to your branch
   ```bash
   git push origin feature/your-feature-name
   ```

4. Create a Pull Request on GitHub

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Authors

- Your Name - Initial work

## 🙏 Acknowledgments

- Shadcn UI for beautiful component library
- React community for excellent tools and documentation
- Flask and Python data science ecosystem

## 📞 Support

For support, email support@example.com or open an issue in the repository.

## 🗺️ Roadmap

- [ ] Add real-time data streaming
- [ ] Integrate with external APIs
- [ ] Advanced ML model optimization
- [ ] Mobile app development
- [ ] Cloud deployment options
- [ ] Data export in multiple formats

---

**Built with ❤️ for Road Safety**
