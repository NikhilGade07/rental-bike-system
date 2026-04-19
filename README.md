# 🚲 BikeRide — Online Bike Rental System

A modern, premium bike rental platform built entirely with **HTML**, **CSS**, and **Vanilla JavaScript**. No backend server needed — all data is persisted locally using `localStorage`.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)

---

## ✨ Features

### For Users
- **User Authentication** — Register and login with email/password (stored in localStorage)
- **Browse Bikes** — View available bikes with real images, search, and filter by type
- **Book Bikes** — Date-range booking with pick-up and return datetime selection
- **Cost Calculator** — Real-time cost breakdown based on hourly rate and duration
- **Booking History** — View all past and active bookings, return or cancel bikes
- **User Profile** — View stats (total bookings, amount spent, active rentals)

### For Admins
- **Dashboard** — KPI overview (total bikes, available, bookings, revenue, active rentals, users)
- **Fleet Management** — Add, edit, delete bikes; toggle availability
- **Booking Management** — View all bookings from all users
- **User Management** — View all registered users and their booking counts

### Design
- 🎨 Modern glassmorphism UI with light theme
- 📱 Fully responsive across desktop, tablet, and mobile
- ⚡ Smooth micro-animations and transitions
- 🔤 Premium typography (Inter + Outfit from Google Fonts)
- 🎯 Font Awesome 6 icons throughout

---

## 🚀 Getting Started

### Quick Start

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/rental-bike-system.git
   cd rental-bike-system
   ```

2. **Open `index.html` in your browser:**
   - Simply double-click `index.html`, or
   - Use a local server like VS Code's Live Server extension

3. **That's it!** No `npm install`, no database setup, no backend server needed.


---

## 📁 Project Structure

```
rental-bike-system/
├── index.html          # Main HTML (single-page application)
├── style.css           # Complete CSS with design system
├── script.js           # All JavaScript (models, services, UI controller)
├── images/             # Bike type images
│   ├── mountain_bike.png
│   ├── road_bike.png
│   ├── city_bike.png
│   └── electric_bike.png
├── .gitignore
└── README.md
```

---

## 🏗️ Architecture

The application follows a clean **OOP architecture** with layered separation:

| Layer          | Description                                      |
|----------------|--------------------------------------------------|
| **Models**     | `User`, `Bike`, `Booking` — ES6 classes          |
| **Repository** | `LocalStorageRepository` — generic CRUD over localStorage |
| **Services**   | `UserService`, `BikeService`, `BookingService` — business logic |
| **Controller** | `AppController` — UI rendering, event binding, navigation |
| **Utilities**  | `Toast`, `Router`, `Session` — UI helpers         |

---

## 🛠️ Technology Stack

| Technology     | Purpose                          |
|----------------|----------------------------------|
| HTML5          | Structure & semantic markup      |
| CSS3           | Styling, glassmorphism, animations |
| Vanilla JS     | Application logic (ES6 Classes)  |
| localStorage   | Client-side data persistence     |
| Font Awesome 6 | Icons                            |
| Google Fonts   | Typography (Inter, Outfit)       |

---

## 📝 Notes

- All data is stored in `localStorage`. Clearing browser data will reset everything.
- On first load, **6 demo bikes** and an **admin account** are automatically seeded.
- Passwords are stored as plain text for educational purposes only.

---

## 📄 License

This project is for educational purposes. Feel free to use, modify, and share.
