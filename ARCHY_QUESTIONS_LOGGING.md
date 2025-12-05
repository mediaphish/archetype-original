# Archy Question Logging System

## Overview

This system logs **every question** asked to Archy to help build and improve the knowledge corpus. By tracking what people ask, which documents are used, and how well questions are answered, you can identify gaps in the corpus and prioritize content creation.

## What Gets Logged

Every question is logged to the `archy_questions` table with:

- **Question & Response**: The full text of both
- **Context**: Which page the question came from (home, methods, philosophy, etc.)
- **Knowledge Docs Used**: Which corpus documents were referenced to answer
- **Knowledge Docs Count**: How many documents were used
- **Response Length**: Character count of the response
- **Was Answered**: Whether Archy successfully answered (false if he couldn't)
- **Is Valuable**: For unanswered questions, whether it's valuable for the corpus
- **Topic Category**: Auto-extracted category (leadership, culture, consulting, etc.)
- **Response Time**: How long it took to generate the response (ms)
- **Session ID**: Links questions from the same conversation
- **Timestamp**: When the question was asked

## Database Setup

Run the SQL schema file to create the table:

```sql
-- Run this in Supabase SQL editor
-- File: ARCHY_QUESTIONS_SCHEMA.sql
```

## How to Use This Data

### 1. Identify Corpus Gaps

Find questions that couldn't be answered or had low knowledge doc usage:

```sql
-- Questions Archy couldn't answer
SELECT question, topic_category, context, created_at
FROM archy_questions
WHERE was_answered = false
ORDER BY created_at DESC;

-- Questions with no knowledge docs used
SELECT question, topic_category, context, created_at
FROM archy_questions
WHERE knowledge_docs_count = 0
ORDER BY created_at DESC;
```

### 2. Find Popular Topics

See what people are asking about most:

```sql
-- Most common topics
SELECT topic_category, COUNT(*) as count
FROM archy_questions
WHERE topic_category IS NOT NULL
GROUP BY topic_category
ORDER BY count DESC;

-- Most common unanswered topics
SELECT topic_category, COUNT(*) as count
FROM archy_questions
WHERE was_answered = false AND topic_category IS NOT NULL
GROUP BY topic_category
ORDER BY count DESC;
```

### 3. Track Knowledge Doc Effectiveness

See which documents are used most often:

```sql
-- Most frequently used knowledge documents
SELECT 
  unnest(knowledge_docs_used) as doc_title,
  COUNT(*) as usage_count
FROM archy_questions
WHERE knowledge_docs_count > 0
GROUP BY doc_title
ORDER BY usage_count DESC;
```

### 4. Identify Context-Specific Gaps

See what questions come from specific pages:

```sql
-- Questions by context/page
SELECT context, COUNT(*) as count, 
       SUM(CASE WHEN was_answered = false THEN 1 ELSE 0 END) as unanswered
FROM archy_questions
GROUP BY context
ORDER BY count DESC;
```

### 5. Find Valuable Unanswered Questions

These are questions that should be added to the corpus:

```sql
-- Valuable questions Archy couldn't answer
SELECT question, topic_category, context, created_at
FROM archy_questions
WHERE was_answered = false 
  AND is_valuable = true
ORDER BY created_at DESC;
```

## Benefits

1. **Data-Driven Corpus Building**: Know exactly what content to add next
2. **Performance Tracking**: See response times and answer quality over time
3. **Topic Prioritization**: Focus on areas with the most unanswered questions
4. **Context Awareness**: Understand what people ask from different pages
5. **Document Effectiveness**: See which knowledge docs are most useful

## Next Steps

1. Run the SQL schema to create the table
2. Start collecting data (logging happens automatically)
3. After a week or two, run the analysis queries above
4. Use the insights to prioritize corpus content creation
5. Re-run analysis periodically to track improvement

## Notes

- Logging happens automatically for all questions
- If logging fails, it won't break the chat (errors are caught)
- The `is_valuable` field is only set for questions Archy couldn't answer
- Topic categories are auto-extracted using keyword matching (can be improved with AI later)

