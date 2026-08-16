package com.example.shapeshift.data.network

import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory

/**
 * Talks to the same FastAPI backend the web app uses (backend/main.py,
 * `npm run dev` proxies /api there). The web app resolves it via the Vite
 * dev-server proxy; a phone/emulator has no such proxy, so the base URL
 * must point at the machine running `py -m uvicorn main:app --port 8000`
 * directly:
 *  - Android emulator -> host loopback is 10.0.2.2 (default below).
 *  - Physical device   -> use the host machine's LAN IP, e.g. "http://192.168.1.23:8000/".
 */
object NetworkModule {

    // Emulator: "http://10.0.2.2:8000/"
    // Physical phone (same WLAN as this PC): PC's LAN IP — update if it changes (DHCP).
    var baseUrl: String = "http://192.168.1.143:8000/"

    private val json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
    }

    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BASIC
    }

    private val authInterceptor = okhttp3.Interceptor { chain ->
        val request = chain.request().newBuilder()
            .header("X-User-Id", SessionHolder.username.value)
            .header("Content-Type", "application/json")
            .build()
        chain.proceed(request)
    }

    private fun buildClient(): OkHttpClient = OkHttpClient.Builder()
        .addInterceptor(authInterceptor)
        .addInterceptor(loggingInterceptor)
        .build()

    private fun buildRetrofit(): Retrofit = Retrofit.Builder()
        .baseUrl(baseUrl)
        .client(buildClient())
        .addConverterFactory(
            json.asConverterFactory("application/json; charset=UTF8".toMediaType())
        )
        .build()

    // Rebuilt lazily; call resetApi() after changing baseUrl.
    private var _api: ApiService? = null

    val api: ApiService
        get() = _api ?: buildRetrofit().create(ApiService::class.java).also { _api = it }

    fun resetApi() {
        _api = null
    }
}
