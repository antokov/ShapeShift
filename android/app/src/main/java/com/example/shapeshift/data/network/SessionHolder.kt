package com.example.shapeshift.data.network

import kotlinx.coroutines.flow.MutableStateFlow

/**
 * Holds the active username in memory so the auth interceptor can read it
 * synchronously (mirrors the `X-User-Id` header sent by the web app's
 * useRoutines.js / useWorkouts.js on every request). Kept in sync with
 * AuthManager's DataStore-backed session on login/logout/app start.
 */
object SessionHolder {
    val username = MutableStateFlow("admin")
}
