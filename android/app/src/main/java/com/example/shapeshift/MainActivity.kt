package com.example.shapeshift

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import com.example.shapeshift.ui.ShapeShiftApp
import com.example.shapeshift.ui.theme.ShapeShiftTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            ShapeShiftTheme {
                ShapeShiftApp()
            }
        }
    }
}
