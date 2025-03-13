# Lending Library App

## Overview

The Lending Library App is a full-stack application developed as a class project for "CS444: Programming for the Web" at Binghamton University during the Spring 2024 semester. It features a React frontend, an Express backend, and a MongoDB database.

- **Frontend:** Built with React to provide a dynamic and responsive user interface.
- **Backend:** Developed using Express to handle API requests and business logic.
- **Database:** MongoDB is used for persistent data storage, enabling efficient management of book records and patron book checkouts/returns.

This project demonstrates the integration of modern web technologies to create a functional and user-friendly lending library system.

## Project Structure

- `frontend/`: Contains the React frontend application.
- `backend/`: Contains the Express backend application.

## Purpose

This application serves as a practical example of integrating a frontend and backend in a web development context. It demonstrates skills in full-stack development, including API design, database management, and user interface design.


## Setup

### Frontend

1. Navigate to the `frontend` directory:
   ```bash
   cd frontend

2. Install dependencies:
    ```bash
    npm install

3. Run the frontend application:
    ```bash
    npm start
The frontend will be available at `http://localhost:2346`.

### Backend

1. Navigate to the `backend` directory:
   ```bash
   cd backend

2. Install dependencies:
    ```bash
    npm install

3. Build the backend application:
    ```bash
    npm run build
    
4. Start the server
    ```bash
    ./dist/index.js config.mjs  ./dist/index.js config.mjs backend/data/books.json 
The backend will be available at `http://localhost:2345`.

## API Endpoints
- GET /api/books: Retrieve a list of all books.
- GET /api/books/:id: Retrieve a book by ID.
- POST /api/books: Add a new book.
- GET /api/lendings/:id:: Retrieve a list of all lendings by ID.
- POST /api/lendings: Checkout a book.
- DELETE /api/lendings: Return a book.

## Tips to install
- While installing mongo might not be installed correctly, check by running 'mongosh'