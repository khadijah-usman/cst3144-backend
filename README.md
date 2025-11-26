CST3144 Lesson Booking API (Backend)

What this API does
	•	Provides lesson data to the frontend
	•	Searches lessons by keyword
	•	Handles order submissions
	•	Updates lesson spaces after checkout
	•	Seeds MongoDB with default lesson data

API Routes
	•	GET /lessons – fetch all lessons
	•	GET /search?q=term – search lessons
	•	POST /orders – create a new order
	•	PUT /lessons/:id – update lesson spaces
How to run
	•	npm install – install dependencies
	•	Create .env with:
	•	MONGODB_URI=your-atlas-uri
	•	PORT=3000
	•	npm run seed – load default lessons
	•	npm run dev – start the server (http://localhost:3000)