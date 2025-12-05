import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id, feedback } = req.query;

    if (!id || !feedback) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    if (!['valuable', 'not_valuable'].includes(feedback)) {
      return res.status(400).json({ error: 'Invalid feedback value' });
    }

    // Update the question record with feedback
    const { data, error } = await supabase
      .from('unanswered_questions')
      .update({
        feedback: feedback,
        is_valuable: feedback === 'valuable',
        feedback_at: new Date().toISOString()
      })
      .eq('question_id', id)
      .select();

    if (error) {
      console.error('Error updating feedback:', error);
      return res.status(500).json({ error: 'Failed to record feedback' });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }

    // Return a simple HTML page confirming the feedback
    const feedbackText = feedback === 'valuable' ? 'valuable' : 'not valuable';
    
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Feedback Recorded</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
              max-width: 600px;
              margin: 50px auto;
              padding: 20px;
              background: #FAFAF9;
            }
            .container {
              background: white;
              padding: 30px;
              border-radius: 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              text-align: center;
            }
            h1 {
              color: #1A1A1A;
              margin-bottom: 10px;
            }
            p {
              color: #6B6B6B;
              line-height: 1.6;
            }
            .success {
              color: #C85A3C;
              font-weight: 600;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>✓ Feedback Recorded</h1>
            <p>Thank you! You've marked this question as <strong>${feedbackText}</strong>.</p>
            <p class="success">This helps Archy learn what questions are valuable.</p>
            <p style="margin-top: 30px; font-size: 14px; color: #999;">
              You can close this window.
            </p>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error in question-feedback handler:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

