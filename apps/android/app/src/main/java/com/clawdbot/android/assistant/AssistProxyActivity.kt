package com.clawdbot.android.assistant

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.util.Log
import com.clawdbot.android.MainActivity

/**
 * Invisible proxy activity that handles all assistant invocation intents.
 * Extracts any assist data and forwards to MainActivity, then finishes immediately.
 *
 * This is a Theme.NoDisplay activity that serves as the entry point for:
 * - Long-press home button (ACTION_ASSIST)
 * - Voice assistant triggers (VOICE_ASSIST, VOICE_COMMAND)
 * - Search button long-press (SEARCH_LONG_PRESS)
 */
class AssistProxyActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        Log.d("AssistProxyActivity", "onCreate: action=${intent?.action}")

        // Extract any assist data from the triggering intent
        val assistBundle = intent?.extras

        // Launch the real assistant UI (MainActivity)
        val launchIntent = Intent(this, MainActivity::class.java).apply {
            action = "com.clawdbot.android.ACTION_ASSISTANT"
            if (assistBundle != null) {
                putExtras(assistBundle)
            }
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }

        startActivity(launchIntent)

        // Finish immediately (this activity is invisible)
        finish()
    }
}
