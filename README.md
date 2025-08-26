# 

# 📚 Library Management System 

Library Management System as Grow More Reading Library is a **fully functional library seat-booking system** built with **HTML, CSS, JavaScript, and MySQL**.  
It allows users to **reserve seats, raise inquiries, and explore facilities** through an interactive **3D gallery with hover effects**, while admins can **manage bookings, inquiries, and transactions in real time**.
  

The project also includes a **custom-built Admin Dashboard** to:
- Monitor **real-time seat status** for 60 uniquely designed seats  
- Respond to **user inquiries instantly**  
- Track **financial records** with monthly and yearly analytics inspired by **Google Pay UI**  

---

### **✨ Key Features**
- 🎟 **Seat Booking System** – Reserve seats dynamically with visual status indicators (red for booked, crown for premium)  
- 📊 **Admin Dashboard** – Manage seats, inquiries, and financial reports  
- 🗄 **MySQL Database Integration** – Store bookings, transactions, and queries securely  
- 🖼 **3D Perspective Gallery** – Interactive hover effects to explore library facilities  
- 📈 **Visual Analytics** – Monthly and yearly summaries with a modern, intuitive UI  

---

### **🛠 Tech Stack**
- **Frontend:** HTML, CSS, JavaScript  
- **Backend:** JS integration for database handling  
- **Database:** MySQL
- **Tools:** XAMPP / WAMP, phpMyAdmin, MySQL Workbench  

---

## ⚙️ Database Schema  
This project uses **three main tables**:  

### **`seats`**
- Stores seat details, booking status, premium flags, and assigned user info.
  
-- Seats Table
CREATE TABLE seats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    seat_number INT,
    is_booked BOOLEAN DEFAULT FALSE,
    is_premium BOOLEAN DEFAULT FALSE,
    end_date DATE DEFAULT NULL,
    library_name VARCHAR(50),
    student_name VARCHAR(100),
    phone_number VARCHAR(15),
    email VARCHAR(100),
    target_exam VARCHAR(100)
);

### **`inquiries`**
- Captures user inquiries with their contact information and messages.

-- Inquiries Table
CREATE TABLE inquiries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    phone_number VARCHAR(15),
    email VARCHAR(100),
    interested_in VARCHAR(100),
    message TEXT,
    inquiry_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

### **`transactions`**
- Tracks payments, seat numbers, and transaction details for each booking.

-- Transactions Table
CREATE TABLE transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(15) NOT NULL,
    seat_number INT NOT NULL,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    amount DECIMAL(10, 2) NOT NULL,
    library_name VARCHAR(50) NOT NULL
);

