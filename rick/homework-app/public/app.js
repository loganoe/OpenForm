document.addEventListener("DOMContentLoaded", () => {
    // DOM Elements
    const webcamElement = document.getElementById("webcam")
    const canvasElement = document.getElementById("canvas")
    const captureBtn = document.getElementById("capture-btn")
    const switchCameraBtn = document.getElementById("switch-camera-btn")
    const saveBtn = document.getElementById("save-btn")
    const problemNumbersInput = document.getElementById("problem-numbers")
    const previewImg = document.getElementById("preview")
    const searchInput = document.getElementById("search-problem")
    const searchBtn = document.getElementById("search-btn")
    const resultsContainer = document.getElementById("results-container")
    const tabBtns = document.querySelectorAll(".tab-btn")
    const tabContents = document.querySelectorAll(".tab-content")
  
    // Variables
    let stream = null
    let facingMode = "environment" // Start with back camera
    let capturedImage = null
  
    // Initialize webcam
    async function initWebcam() {
      try {
        if (stream) {
          stream.getTracks().forEach((track) => track.stop())
        }
  
        const constraints = {
          video: {
            facingMode: facingMode,
          },
        }
  
        stream = await navigator.mediaDevices.getUserMedia(constraints)
        webcamElement.srcObject = stream
  
        // Enable capture button once webcam is ready
        captureBtn.disabled = false
      } catch (error) {
        console.error("Error accessing webcam:", error)
        alert("Error accessing webcam. Please make sure you have granted camera permissions.")
      }
    }
  
    // Switch between front and back camera
    function switchCamera() {
      facingMode = facingMode === "user" ? "environment" : "user"
      initWebcam()
    }
  
    // Capture image from webcam
    function captureImage() {
      const context = canvasElement.getContext("2d")
  
      // Set canvas dimensions to match video
      canvasElement.width = webcamElement.videoWidth
      canvasElement.height = webcamElement.videoHeight
  
      // Draw video frame to canvas
      context.drawImage(webcamElement, 0, 0, canvasElement.width, canvasElement.height)
  
      // Get image data URL
      capturedImage = canvasElement.toDataURL("image/jpeg")
  
      // Show preview
      previewImg.src = capturedImage
  
      // Enable save button
      saveBtn.disabled = false
    }
  
    // Save homework with problem numbers
    function saveHomework() {
      const problemNumbers = problemNumbersInput.value
        .split(",")
        .map((num) => num.trim())
        .filter((num) => num !== "")
  
      if (problemNumbers.length === 0) {
        alert("Please enter at least one problem number.")
        return
      }
  
      if (!capturedImage) {
        alert("Please capture an image first.")
        return
      }
  
      // Disable save button while uploading
      saveBtn.disabled = true
      saveBtn.textContent = "Saving..."
  
      // Convert base64 to blob for upload
      const base64Response = fetch(capturedImage)
      base64Response
        .then((res) => res.blob())
        .then((blob) => {
          const formData = new FormData()
          formData.append("image", blob, "homework.jpg")
          formData.append("problemNumbers", JSON.stringify(problemNumbers))
  
          return fetch("/api/homework", {
            method: "POST",
            body: formData,
          })
        })
        .then((response) => {
          if (response.ok) {
            return response.json()
          } else {
            return response.json().then((data) => {
              throw new Error(data.message || "Failed to save homework")
            })
          }
        })
        .then((data) => {
          alert("Homework saved successfully!")
  
          // Download the image
          const link = document.createElement("a")
          link.href = capturedImage
          link.download = `homework_${problemNumbers.join("-")}_${new Date().toISOString().slice(0, 10)}.jpg`
          link.click()
  
          // Reset form
          problemNumbersInput.value = ""
          previewImg.src = "/placeholder.svg?height=300&width=400"
          capturedImage = null
        })
        .catch((error) => {
          alert(error.message)
          console.error("Error saving homework:", error)
        })
        .finally(() => {
          saveBtn.disabled = false
          saveBtn.textContent = "Save Homework"
        })
    }
  
    // Search for homework by problem number
    function searchHomework() {
      const searchTerm = searchInput.value.trim()
  
      if (!searchTerm) {
        alert("Please enter a problem number to search.")
        return
      }
  
      // Show loading state
      resultsContainer.innerHTML = '<div class="loading">Searching</div>'
  
      fetch(`/api/homework/search?problem=${searchTerm}`)
        .then((response) => {
          if (response.ok) {
            return response.json()
          } else {
            return response.json().then((data) => {
              throw new Error(data.message || "Search failed")
            })
          }
        })
        .then((data) => {
          displayResults(data.homeworks)
        })
        .catch((error) => {
          alert(error.message)
          resultsContainer.innerHTML = "<p>Error loading results.</p>"
        })
    }
  
    // Display search results
    function displayResults(results) {
      resultsContainer.innerHTML = ""
  
      if (results.length === 0) {
        resultsContainer.innerHTML = "<p>No results found.</p>"
        return
      }
  
      results.forEach((item) => {
        const resultItem = document.createElement("div")
        resultItem.className = "result-item"
  
        resultItem.innerHTML = `
                  <img src="/api/homework/image/${item.id}" alt="Homework">
                  <div class="info">
                      <p class="problem-numbers">Problems: ${item.problemNumbers.join(", ")}</p>
                      <p>Date: ${new Date(item.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div class="actions">
                      <button class="download-btn" data-id="${item.id}">Download</button>
                      <button class="delete-btn" data-id="${item.id}">Delete</button>
                  </div>
              `
  
        resultsContainer.appendChild(resultItem)
      })
  
      // Add event listeners to download and delete buttons
      document.querySelectorAll(".download-btn").forEach((btn) => {
        btn.addEventListener("click", function () {
          const id = this.getAttribute("data-id")
          window.open(`/api/homework/download/${id}`, "_blank")
        })
      })
  
      document.querySelectorAll(".delete-btn").forEach((btn) => {
        btn.addEventListener("click", function () {
          const id = this.getAttribute("data-id")
  
          if (confirm("Are you sure you want to delete this homework?")) {
            fetch(`/api/homework/${id}`, {
              method: "DELETE",
            })
              .then((response) => {
                if (response.ok) {
                  return response.json()
                } else {
                  return response.json().then((data) => {
                    throw new Error(data.message || "Delete failed")
                  })
                }
              })
              .then((data) => {
                alert("Homework deleted successfully!")
                searchHomework() // Refresh results
              })
              .catch((error) => {
                alert(error.message)
              })
          }
        })
      })
    }
  
    // Tab switching
    function switchTab() {
      const tabId = this.getAttribute("data-tab")
  
      // Update active tab button
      tabBtns.forEach((btn) => btn.classList.remove("active"))
      this.classList.add("active")
  
      // Update active tab content
      tabContents.forEach((content) => content.classList.remove("active"))
      document.getElementById(tabId).classList.add("active")
  
      // Initialize webcam when switching to capture tab
      if (tabId === "capture") {
        initWebcam()
      }
    }
  
    // Event Listeners
    captureBtn.addEventListener("click", captureImage)
    switchCameraBtn.addEventListener("click", switchCamera)
    saveBtn.addEventListener("click", saveHomework)
    searchBtn.addEventListener("click", searchHomework)
    tabBtns.forEach((btn) => btn.addEventListener("click", switchTab))
  
    // Initialize webcam on page load
    initWebcam()
  })
  
  