import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Simple auth check - you can add a secret key if needed
  const { secret } = req.body;
  if (secret !== process.env.JOURNAL_UPDATE_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('🔄 Starting journal update...');
    
    // Run the journal update script
    const { stdout, stderr } = await execAsync('node scripts/manage-journal.mjs update');
    
    console.log('✅ Journal update completed');
    console.log('STDOUT:', stdout);
    if (stderr) console.log('STDERR:', stderr);
    
    return res.status(200).json({ 
      success: true, 
      message: 'Journal posts updated successfully',
      output: stdout 
    });
    
  } catch (error) {
    console.error('❌ Journal update failed:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Journal update failed',
      details: error.message 
    });
  }
}
