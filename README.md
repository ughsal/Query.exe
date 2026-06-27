# QUERY.EXE

> **Production-oriented Retrieval-Augmented Generation (RAG) web search application built with LangChain LCEL, Next.js, and Express.**

A full-stack AI search application focused on **grounded retrieval**, **multi-LLM orchestration**, and **production-ready backend engineering** rather than a traditional chatbot implementation.

---

## 🚀 Highlights

* Retrieval-Augmented Generation (RAG) pipeline
* LangChain LCEL workflow composition
* Live web search with Tavily
* Multi-provider LLM support (Ollama, Gemini, Groq)
* Source quality evaluation
* Retrieval confidence scoring
* Grounded responses with citations
* Custom Windows 98-inspired responsive UI
* Rate limiting, daily IP quotas, Helmet & CORS
* Strongly typed APIs using TypeScript & Zod

---

## 🏗️ Architecture

```text
User
 │
 ▼
Next.js Frontend
 │
 ▼
Express Backend
 │
 ▼
LangChain LCEL Pipeline
 │
 ├── Tavily Search
 ├── Retrieve Top Results
 ├── Open & Parse Pages
 ├── Summarize Content
 ├── Evaluate Source Quality
 ├── Compute Retrieval Confidence
 │
 ▼
LLM Response Generation
 │
 ▼
Grounded Answer + Sources
```

---

## 🧠 AI Engineering Concepts

This project explores engineering patterns commonly found in production AI systems.

* Retrieval-Augmented Generation (RAG)
* Prompt Engineering
* Multi-LLM Provider Abstraction
* Retrieval Confidence Estimation
* Source Reliability Evaluation
* Hallucination Reduction
* Structured AI Responses

---

## ⚙️ Tech Stack

### Frontend

* Next.js
* React
* TypeScript
* Tailwind CSS

### Backend

* Express
* LangChain LCEL
* Tavily Search API
* Zod
* Helmet
* Express Rate Limit

### Supported Models

* Ollama
* Google Gemini
* Groq

---

## 🛡️ Production Considerations

Rather than focusing solely on AI functionality, the backend includes several production-oriented safeguards.

* Rate limiting
* Daily IP request caps
* Query validation
* Helmet security headers
* CORS configuration
* Environment variable separation
* Modular pipeline architecture

---

## 💡 Engineering Decisions

* Retrieval before generation to improve factual grounding.
* Separate summarization and answer-generation stages.
* Score retrieval confidence instead of presenting every answer with equal certainty.
* Evaluate source quality to reduce reliance on promotional and low-authority content.
* Abstract LLM providers behind a common interface for easy switching.
* Build a responsive retro-inspired interface while keeping the backend provider-agnostic.

---

## 📦 Running Locally

```bash
# Client
cd client
npm install
npm run dev

# Server
cd ../server
npm install
npm run dev
```

Configure the required environment variables before running the application.

---

## 🔭 Future Improvements

* Streaming responses
* Semantic caching
* Citation-aware answer synthesis
* Conversation history
* LangSmith tracing
* Hybrid vector retrieval
* Authentication & user accounts

---

## 📖 Why I Built This

Most AI demos stop at calling an LLM API.

This project was built to explore the engineering challenges involved in production AI systems—retrieval pipelines, prompt engineering, source validation, backend architecture, and secure deployment—while providing a practical, end-to-end example of a Retrieval-Augmented Generation application.
