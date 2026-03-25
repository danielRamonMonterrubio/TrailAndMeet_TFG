package com.trailandmeet

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.provider.DocumentsContract
import android.util.Base64
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.WritableNativeMap

class GpxPickerModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), ActivityEventListener {

    private var mPickerPromise: Promise? = null
    private val PICK_FILE_REQUEST_CODE = 8765

    init {
        reactContext.addActivityEventListener(this)
    }

    override fun getName(): String = "GpxPicker"

    @ReactMethod
    fun pickGpxFile(promise: Promise) {
        mPickerPromise = promise
        val activity = reactApplicationContext.currentActivity
        if (activity == null) {
            promise.reject("ERROR", "No activity available")
            return
        }
        
        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = "*/*"
        }
        try {
            activity.startActivityForResult(intent, PICK_FILE_REQUEST_CODE)
        } catch (e: Exception) {
            promise.reject("ERROR", "Error starting file picker: ${e.message}")
        }
    }

    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == PICK_FILE_REQUEST_CODE) {
            if (resultCode == Activity.RESULT_OK && data != null) {
                val uri = data.data
                if (uri != null) {
                    try {
                        val fileName = getFileName(uri)
                        val fileContent = readFileAsBase64(uri)

                        val result: WritableMap = WritableNativeMap()
                        result.putString("name", fileName)
                        result.putString("base64", fileContent)
                        result.putString("type", "application/gpx+xml")

                        mPickerPromise?.resolve(result)
                    } catch (e: Exception) {
                        mPickerPromise?.reject("ERROR", "Error: ${e.message}")
                    }
                } else {
                    mPickerPromise?.reject("ERROR", "No file selected")
                }
            } else {
                mPickerPromise?.reject("CANCELLED", "File selection cancelled")
            }
            mPickerPromise = null
        }
    }

    override fun onNewIntent(intent: Intent) {}

    private fun getFileName(uri: Uri): String {
        var name = ""
        val cursor = reactApplicationContext.contentResolver.query(uri, null, null, null, null)
        cursor?.use {
            if (it.moveToFirst()) {
                val displayNameIndex = it.getColumnIndex(DocumentsContract.Document.COLUMN_DISPLAY_NAME)
                if (displayNameIndex >= 0) {
                    name = it.getString(displayNameIndex)
                }
            }
        }
        return if (name.isEmpty()) "archivo.gpx" else name
    }

    private fun readFileAsBase64(uri: Uri): String {
        val inputStream = reactApplicationContext.contentResolver.openInputStream(uri)
        val bytes = inputStream?.readBytes() ?: ByteArray(0)
        inputStream?.close()
        return Base64.encodeToString(bytes, Base64.NO_WRAP)
    }
}

