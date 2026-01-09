# Pixel Consulting

A full-stack application with Next.js frontend and Python backend.

## Project Structure

```
pixel-consulting/
├── frontend/          # Next.js application
│   ├── app/           # App router pages
│   ├── components/    # React components
│   └── public/        # Static assets
└── backend/           # Python backend
    ├── main.py        # API entry point
    ├── rag.py         # RAG implementation
    └── prompts.py     # LLM prompts
```

## Getting Started

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py
```

## License

MIT
