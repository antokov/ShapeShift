package com.example.shapeshift

import android.app.Application
import com.example.shapeshift.data.auth.AuthManager
import com.example.shapeshift.data.network.NetworkModule
import com.example.shapeshift.data.repository.ProfileRepository
import com.example.shapeshift.data.repository.RoutineRepository
import com.example.shapeshift.data.repository.WorkoutRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob

/** Simple manual DI container — no Hilt, mirrors the small hook-based setup on the web side. */
class AppContainer(context: Application) {
    val appScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)
    val authManager = AuthManager(context)
    val routineRepository = RoutineRepository(NetworkModule.api, appScope)
    val workoutRepository = WorkoutRepository(NetworkModule.api, appScope)
    val profileRepository = ProfileRepository(context, appScope)
}

class ShapeShiftApplication : Application() {
    val container: AppContainer by lazy { AppContainer(this) }
}
