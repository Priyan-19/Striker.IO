# Striker.IO — Daily Habit Tracker

Striker.IO is a beautiful, modern daily habit and streak tracker. It features a GitHub-style contribution graph that visualizes your consistency and growth over time. Designed with a sleek glassmorphism UI and a rich dark mode aesthetic, it makes tracking your daily goals a visually rewarding experience.

## ✨ Features

- **Visual Contribution Graph**: See your progress at a glance with a 365-day heat map grid.
- **Task Management**: Create multiple habits or tasks and track them individually with customized colors and icons.
- **Streak Tracking**: Automatically calculates and displays your current and best streaks to keep you motivated.
- **Daily Logging**: Log your activities and view your recent commits/progress entries.
- **Glassmorphism UI**: Beautiful, responsive, single-page application design with interactive hover effects and fluid layout.
- **User Authentication**: Secure signup and login to keep your data private.
- **Customizable**: Set specific color preferences based on your activity levels.

## 🛠️ Tech Stack

- **Frontend**: Vanilla HTML5, CSS3 (Custom Properties, Grid/Flexbox), and JavaScript (ES6+).
- **Backend**: Django (Python 4.2+).
- **Database**: PostgreSQL (configured for Supabase, but works with any standard Postgres setup).
- **Architecture**: Single-page frontend layout integrated directly with Django templates and static file serving.

## 🚀 Getting Started

### Prerequisites

- Python 3.8 or higher
- PostgreSQL (or a Supabase account)
- Git

### Installation

1. **Clone the repository:**
   ```bash
   git clone <your-repo-url>
   cd <your-repo-directory>
   ```

2. **Set up a virtual environment:**
   ```bash
   cd backend
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment Variables:**
   Copy the example environment file and update it with your database credentials:
   ```bash
   cp .env.example .env
   ```
   *Edit `.env` and fill in your PostgreSQL/Supabase connection details.*

5. **Apply Database Migrations:**
   ```bash
   python manage.py migrate
   ```

6. **Run the Development Server:**
   ```bash
   python manage.py runserver
   ```

7. **Access the Application:**
   Open your browser and navigate to `http://127.0.0.1:8000/`.

## 📁 Project Structure

```
├── backend/
│   ├── manage.py               # Django management script
│   ├── requirements.txt        # Python dependencies
│   ├── striker_project/        # Core Django settings & routing
│   └── striker_app/            # Main application (Models, Views, Auth)
├── frontend/                   # Frontend assets
│   ├── index.html              # Main single-page application layout
│   ├── css/
│   │   └── styles.css          # Core styles, glassmorphism UI
│   └── js/
│       └── app.js              # Frontend logic, API calls, dynamic rendering
└── README.md
```

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the issues page.

## 📝 License

This project is licensed under the MIT License.
