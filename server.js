const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const cors = require('cors');
const cron = require('node-cron');
const path = require('path');
const fs = require('fs');

const app = express();
const port = 3000;


app.use(cors());
app.use(bodyParser.json());
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.url}`);
  next();
});
app.use(express.static(path.join(__dirname, 'public')));


const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'K78647864P',
  database: 'seat_booking'
});

db.connect((err) => {
  if (err) {
    console.error('❌ Database connection failed:', err);
    return;
  }
  console.log('✅ Connected to MySQL database');
});


app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'home.html'));
});

app.get('/home', (req, res) => res.redirect('/'));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));


app.post('/submit-inquiry', (req, res) => {
  const { name, phone_number, email, interested_in, message } = req.body;

  if (!name || !phone_number || !email || !interested_in) {
    return res.status(400).json({ message: 'Please fill all required fields' });
  }

  const sql = `INSERT INTO inquiries 
    (name, phone_number, email, interested_in, message) 
    VALUES (?, ?, ?, ?, ?)`;
  
  const values = [name, phone_number, email, interested_in, message || ''];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error('❌ Error inserting inquiry:', err);
      return res.status(500).json({ message: 'Database error: ' + err.sqlMessage });
    }
    console.log('✅ Inquiry inserted successfully');
    res.status(200).json({ message: 'Inquiry submitted successfully!' });
  });
});


app.get('/api/inquiries', (req, res) => {
  
  const deleteOldQuery = 'DELETE FROM inquiries WHERE inquiry_date < NOW() - INTERVAL 7 DAY';
  
  db.query(deleteOldQuery, (deleteErr, deleteResult) => {
    if (deleteErr) {
      console.error('❌ Error deleting old inquiries:', deleteErr);
    } else if (deleteResult.affectedRows > 0) {
      console.log(`✅ Deleted ${deleteResult.affectedRows} old inquiries`);
    }

   
    const fetchQuery = `
      SELECT *, 
        TIMESTAMPDIFF(HOUR, inquiry_date, NOW()) AS hours_ago,
        TIMESTAMPDIFF(DAY, inquiry_date, NOW()) AS days_ago
      FROM inquiries
      ORDER BY inquiry_date DESC
    `;

    db.query(fetchQuery, (fetchErr, results) => {
      if (fetchErr) {
        console.error('❌ Error fetching inquiries:', fetchErr);
        return res.status(500).json({ error: 'Database error' });
      }

      res.json(results.map(row => ({
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone_number,
        type: row.interested_in,
        message: row.message,
        date: new Date(row.inquiry_date),
        hours_ago: row.hours_ago,
        days_ago: row.days_ago
      })));
    });
  });
});

app.delete('/api/inquiries/:id', (req, res) => {
  const id = req.params.id;
  const sql = 'DELETE FROM inquiries WHERE id = ?';
  
  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error('❌ Error deleting inquiry:', err);
      return res.status(500).json({ error: 'Failed to delete inquiry' });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Inquiry not found' });
    }
    
    console.log(`✅ Deleted inquiry ID: ${id}`);
    res.status(200).json({ message: 'Inquiry deleted successfully' });
  });
});

////////////////////////////////////////////>>  seat booking  << //////////////////////////////////////////////////////////////////

app.use(cors());
app.use(bodyParser.json());


cron.schedule('0 0 * * *', () => {
  const query = "UPDATE seats SET is_booked = 0, student_name = NULL, phone_number = NULL, email = NULL, target_exam = NULL, end_date = NULL WHERE end_date < CURDATE()";
  db.query(query, (err) => {
    if (err) console.error('Seat cleanup error:', err);
    else console.log('Expired seats unbooked successfully');
  });
});


app.get('/api/seats/:library', (req, res) => {
  const library = req.params.library;
  const query = `SELECT * FROM seats WHERE library_name = ?`;
  
  db.query(query, [library], (err, results) => {
    if (err) return res.status(500).send(err);
    
    const seats = results.map(seat => ({
      id: seat.id,
      number: seat.seat_number,
      isBooked: seat.is_booked,
      isPremium: seat.is_premium,
      showAsPremium: seat.is_premium && !seat.is_booked,
      endDate: seat.end_date
    }));
    
    res.json(seats);
  });
});

// Book a seat

app.post('/api/book', (req, res) => {
  const { seatId, library, duration, userDetails, adminPassword } = req.body;
  const { fullName, phoneNumber, email, exam } = userDetails;

 
  if (adminPassword !== "7864") {
    return res.status(401).json({ 
      success: false, 
      message: "Incorrect payment verification code" 
    });
  }

 
  db.beginTransaction(err => {
    if (err) return res.status(500).send(err);

  
    const checkPremiumQuery = 'SELECT is_premium FROM seats WHERE id = ? AND library_name = ?';
    db.query(checkPremiumQuery, [seatId, library], (err, results) => {
      if (err) return db.rollback(() => res.status(500).send(err));
      
      if (results.length === 0) {
        return db.rollback(() => res.status(400).json({ 
          success: false, 
          message: 'Seat not found'
        }));
      }

      const isActuallyPremium = results[0].is_premium;
      
  
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + parseInt(duration));
      
    
      const basePrice = 1000 * duration;
      const premiumFee = isActuallyPremium ? (100 * duration) : 0;
      const discount = duration === 3 ? 300 : duration === 6 ? 900 : 0;
      const totalAmount = basePrice + premiumFee - discount;

    
      const seatQuery = `UPDATE seats SET 
        is_booked = 1,
        student_name = ?,
        phone_number = ?,
        email = ?,
        target_exam = ?,
        end_date = ?
        WHERE id = ? AND library_name = ?`;
      
      db.query(seatQuery, 
        [fullName, phoneNumber, email, exam, endDate, seatId, library], 
        (err, result) => {
          if (err) return db.rollback(() => res.status(500).send(err));
          
          if (result.affectedRows === 0) {
            return db.rollback(() => res.status(400).json({ 
              success: false, 
              message: 'Seat not available'
            }));
          }

    
          const transactionQuery = `INSERT INTO transactions 
            (student_name, phone_number, seat_number, amount, library_name) 
            VALUES (?, ?, ?, ?, ?)`;
          
          db.query(transactionQuery, 
            [fullName, phoneNumber, seatId, totalAmount, library], 
            (err) => {
              if (err) return db.rollback(() => res.status(500).send(err));
              
              db.commit(err => {
                if (err) return db.rollback(() => res.status(500).send(err));
                res.json({ success: true });
              });
            });
        });
    });
  });
});



/////////////////////////////>> admin seat renderrring and editing <<//////////////////////////////


app.get('/api/admin/seats/:library', (req, res) => {
  const library = req.params.library;
  const query = `
    SELECT 
      id, 
      seat_number AS number,
      is_booked AS booked,
      is_premium AS premium,
      end_date AS endDate,
      student_name AS name,
      phone_number AS phone,
      email,
      target_exam AS exam
    FROM seats 
    WHERE library_name = ?
    ORDER BY seat_number ASC
  `;
  
  db.query(query, [library], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).send(err);
    }
    console.log(`Fetched ${results.length} seats for ${library}`);
    res.json(results);
  });
});

app.put('/api/admin/seats/:id', (req, res) => {
  const seatId = req.params.id;
  const { name, phone, email, exam, endDate, premium } = req.body;
  
  const query = `
    UPDATE seats SET
      student_name = ?,
      phone_number = ?,
      email = ?,
      target_exam = ?,
      end_date = ?,
      is_premium = ?
    WHERE id = ?
  `;
  
  const values = [name, phone, email, exam, endDate, premium, seatId];
  
  db.query(query, values, (err, result) => {
    if (err) return res.status(500).send(err);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Seat not found' });
    }
    
    res.json({ success: true });
  });
});


app.get('/api/admin/stats/:library', (req, res) => {
  const library = req.params.library;
  const query = `
    SELECT 
      COUNT(*) AS total,
      SUM(is_booked = 0) AS available,
      SUM(is_booked = 1) AS booked,
      SUM(is_premium = 1) AS premium
    FROM seats
    WHERE library_name = ?
  `;
  
  db.query(query, [library], (err, results) => {
    if (err) return res.status(500).send(err);
    res.json(results[0]);
  });
});


///////////////////////////////////admin Transaction Manageent /////////////////////////////////




app.get('/api/transactions', (req, res) => {
  const query = `
    SELECT * 
    FROM transactions
    ORDER BY transaction_date DESC
  `;
  
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching transactions:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    res.json(results);
  });
});


app.post('/api/expenses', (req, res) => {
  const { description, amount, date, library } = req.body;
  
  if (!description || !amount || !date || !library) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  
  const expenseData = {
    student_name: description,
    phone_number: '9876543210', 
    seat_number: 89,
    amount: parseFloat(amount),
    library_name: library,
    transaction_date: new Date(date)
  };
  
  const query = `
    INSERT INTO transactions 
    (student_name, phone_number, seat_number, amount, library_name, transaction_date)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  
  const values = [
    expenseData.student_name,
    expenseData.phone_number,
    expenseData.seat_number,
    expenseData.amount,
    expenseData.library_name,
    expenseData.transaction_date
  ];
  
  db.query(query, values, (err, result) => {
    if (err) {
      console.error('Error adding expense:', err);
      return res.status(500).json({ error: 'Failed to add expense' });
    }
    
    res.json({ success: true, id: result.insertId });
  });
});


app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});