<div align="center">

# 🎯 Striker.IO
### A Beautiful, Modern Daily Habit & Streak Tracker

[![Django](https://img.shields.io/badge/Django_4.2-092E20?style=for-the-badge&logo=django&logoColor=white)](https://www.djangoproject.com/)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)

**Striker.IO** is an elegant daily habit and streak tracker. It features a GitHub-style contribution graph that visualizes your consistency and growth over time. Designed with a sleek glassmorphism UI and a rich dark mode aesthetic, it makes tracking your daily goals a visually rewarding experience.

[API Documentation](http://localhost:8000/) · [Report a Bug](https://github.com/yourusername/striker.io/issues)

</div>

---

## 📖 Project Overview

Striker.IO simplifies personal growth by turning habit tracking into a visual achievement. Whether you're coding, exercising, or reading, every daily log fills out your contribution grid, reinforcing your consistency. 

### Core Value Proposition
- **Visual Motivation**: See your 365-day progress at a glance with a heatmap grid.
- **Flawless Design**: A premium, responsive glassmorphism UI that feels native and fluid.
- **Frictionless Logging**: A single-page application that requires no page reloads to update your progress.
- **Customizable Experience**: Color code your tasks depending on intensity or category.

---

## 🏗️ System Architecture

Striker.IO utilizes a robust, hybrid architecture:

### 🐍 Backend: Django Engine
The backend is a secure, monolithic Python application built with **Django**. It provides the core API and serves the frontend seamlessly.
- **Data Models**: Relational schemas for Users, Tasks, and Daily Logs.
- **Authentication**: Built-in Django Auth integrated for secure, private user accounts.
- **PostgreSQL**: Scalable database configured out-of-the-box (compatible with Supabase).

### ⚡ Frontend: Vanilla Glassmorphism UI
The frontend is a lightweight, dependency-free **Vanilla HTML/CSS/JS** application.
- **Reactive DOM**: Optimized vanilla JavaScript (ES6+) for dynamic UI updates and API calls.
- **CSS Grid/Flexbox Layout**: A perfectly proportioned, static single-page layout (100vh) designed to never scroll externally.
- **Design System**: A sleek, dark-themed aesthetic with animated background meshes, glass orbs, and backdrop-filters.

---

## 📂 Project Structure

```text
.
├── backend/                # Python Django Backend
│   ├── manage.py           # Django management script
│   ├── requirements.txt    # Python dependencies
│   ├── striker_project/    # Core Django settings & routing
│   │   ├── settings.py     # Configuration (DB, Static, Apps)
│   │   └── urls.py         # Global URL routing
│   └── striker_app/        # Main application logic
│       ├── models.py       # User, Task, and Log models
│       └── views.py        # API endpoints and logic
├── frontend/               # Frontend Assets (served by Django)
│   ├── index.html          # Main single-page application layout
│   ├── css/
│   │   └── styles.css      # Core styles, animations, glassmorphism
│   └── js/
│       └── app.js          # Client-side logic, API interactions
├── .env.example            # Environment variables template
├── .gitignore              # Git ignore rules
└── README.md               # Project Overview (This file)
```

---

## 🚀 Key Features

### 📊 Progress Tracking
*   **🌐 Visual Contribution Graph**: A dynamic 365-day heat map highlighting your activity.
*   **🔥 Streak Tracking**: Automatic calculation of your current and best all-time streaks.
*   **📈 Recent Commits**: A dedicated log of your most recent activity entries.

### 🎨 Customization & UI
*   **🎨 Color Themes**: Choose from multiple vibrant gradient themes for individual tasks.
*   **🖌️ Dynamic Styling**: Adjustable opacity settings to represent task intensity ("Brighter = more entries").
*   **📱 Responsive Layout**: Flawless scaling from desktop to mobile without vertical scrolling.

---

## 🏁 Getting Started

### 1. Configure the Environment
Clone the repository and set up your environment variables for PostgreSQL:
```bash
git clone https://github.com/yourusername/striker.io.git
cd striker.io/backend
python -m venv venv

# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
```
*Edit `.env` and fill in your PostgreSQL/Supabase connection details.*

### 2. Initialize the Database
```bash
python manage.py migrate
```

### 3. Launch the Server
```bash
python manage.py runserver
```

### 4. Start Tracking
1. Open `http://localhost:8000`
2. Create an account or sign in.
3. Add a new task and start logging your progress!

---

<div align="center">
  <p>Built with ❤️ for Personal Growth</p>
  <p>Developed by <strong>Priyan</strong></p>
  <p>© 2026 Striker.IO Platform. All Rights Reserved.</p>
</div>
