import express from 'express';
import Amadeus from 'amadeus';
import cors from 'cors';
import dotenv from 'dotenv';
import process from 'node:process';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const amadeus = new Amadeus({
  clientId: process.env.AMADEUS_CLIENT_ID,
  clientSecret: process.env.AMADEUS_CLIENT_SECRET
});

// ১. সিটি/এয়ারপোর্ট সাজেশন রুট
app.get('/api/city-search', async (req, res) => {
  try {
    const { keyword } = req.query;
    if (!keyword || keyword.length < 2) return res.json([]);

    const response = await amadeus.referenceData.locations.get({
      keyword: keyword.toUpperCase(),
      subType: 'CITY,AIRPORT',
    });
    res.json(response.data);
  } catch (error) {
    console.error("City Search Error:", error.code);
    res.status(500).json({ error: "Suggestions not available" });
  }
});

// ২. ফ্লাইট সার্চ রুট (Round Trip + Adults + Children)
app.get('/api/search-flights', async (req, res) => {
  try {
    const { origin, destination, date, returnDate, adults, children, infants, cabinClass } = req.query;
    
    const extractCode = (str) => {
      if (str.includes('(')) return str.split('(')[1].split(')')[0].toUpperCase();
      return str.trim().toUpperCase().substring(0, 3);
    };

    const searchParams = {
      originLocationCode: extractCode(origin),
      destinationLocationCode: extractCode(destination),
      departureDate: date,
      adults: adults || 1,
      children: children || 0,
      infants: infants || 0, // ইনফ্যান্ট যোগ করা হলো
      travelClass: (cabinClass || 'ECONOMY').toUpperCase(),
      max: 20,
      currencyCode: 'USD' // আপনি চাইলে BDT ট্রাই করতে পারেন যদি আপনার API সাপোর্ট করে
    };

    // রাউন্ড ট্রিপ হলে রিটার্ন ডেট যোগ হবে
    if (returnDate && returnDate !== "null" && returnDate !== "") {
      searchParams.returnDate = returnDate;
    }

    const response = await amadeus.shopping.flightOffersSearch.get(searchParams);
    res.json(response.data);
  } catch (error) {
    const errorDetail = error.response?.result?.errors?.[0]?.detail || "Flight not found";
    res.status(400).json({ error: "Search Failed", detail: errorDetail });
  }
});

// Render এবং লোকাল এনভায়রনমেন্ট উভয়ের জন্যই পারফেক্ট
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));