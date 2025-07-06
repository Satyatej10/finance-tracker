# money Finance (MERN)

A full-stack web application to manage your income, expenses, receipts, and financial analytics.

## Features
- User authentication (JWT)
- Add, view, and categorize income/expenses
- Paginated transaction list with filters
- Analytics dashboard with charts
- Upload receipts (image/PDF) and extract expenses using OCR
- Upload transaction history PDF and parse entries
- Responsive UI with Tailwind CSS

## Tech Stack
- **Frontend:** React, React Router, Axios, Tailwind CSS, Recharts
- **Backend:** Node.js, Express, MongoDB, Mongoose, Multer, Tesseract.js, pdf-parse

## Getting Started

### Backend
1. `cd server`
2. `npm install`
3. Create a `.env` file with:
   ```
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/pfa
   JWT_SECRET=your_jwt_secret
   ```
4. `npm run dev` (uses nodemon)

### Frontend
1. `cd client`
2. `npm install`
3. `npm run dev` (or `npm start`)


### Usage
- Register and login to your account.
- Add income or expense transactions manually.
- Filter transactions by date, category, or type.
- View analytics on the dashboard (e.g., pie charts, monthly trends).
- **Upload receipts (JPG/PNG/PDF):**
  - Go to "Upload Receipt"
  - Select an image or PDF receipt
  - OCR will extract expense data and auto-fill transaction fields
- **Upload transaction history (PDF):**
  - Go to "Upload Bank Statement"
  - Select your PDF file (must follow supported format)
  - Parsed transactions will appear in your transaction list

> 📂 [Sample Receipt Image](./public/samples/sample-receipt.png)  
> 📄 [Sample Transaction PDF](./public/samples/sample-transactions.pdf)



## Folder Structure
```
/server
  /controllers
  /models
  /routes
  /middlewares
  /utils
  app.js
  package.json
/client
  /src
    /pages
    /components
    /services
    App.js
    main.jsx
    index.css
  package.json
  tailwind.config.js
  index.html
```
