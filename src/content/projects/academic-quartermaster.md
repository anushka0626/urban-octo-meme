---
title: Academic Quartermaster
summary: A multi-agent assistant that brings research notes, deadlines and tasks into one place, built with Google's Agent Development Kit.
tech: [Python, Google ADK, FastAPI, Docker, Cloud Run, MCP, SQLite]
role: GenAI Academy hackathon project
date: '2026'
order: 3
icon: research
links:
  github: https://github.com/anushka0626/Academic_Quartermaster
---

## The problem

A student's work is scattered across notes, calendars, task lists and email. This project puts one assistant in front of all of them.

## How it works

A coordinating agent hands each request to a specialist:

- **The Librarian** keeps a persistent SQLite knowledge base, for RAG-like search across projects.
- **The Registrar** checks Google Calendar for clashes before creating tasks in Google Tasks.
- **The Secretary** writes lecture notes into Notion and drafts emails in Gmail.

The agents use Gemini, and they reach those third-party apps through the Model Context Protocol via Zapier.

## Deployment

The FastAPI backend is containerized with Docker and was deployed to Google Cloud Run (`asia-south1`) as a REST API with asynchronous tool-calling and session management.
