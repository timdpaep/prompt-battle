// Modern JavaScript for Prompt Battle Application

// DOM Elements
const navLinks = document.querySelectorAll(".nav-link");
const pages = document.querySelectorAll(".page");
const adminPage = document.getElementById("admin-page");
const uploadForm = document.getElementById("upload-form");
const preview = document.getElementById("preview");
const prompterImage = document.getElementById("prompter-image");
const uploadedImagesContainer = document.getElementById(
  "uploaded-images-container"
);
const voteContainer = document.getElementById("vote-container");
const resultsContainer = document.getElementById("results-container");
const adminLoginForm = document.getElementById("admin-login-form");
const adminLoginContainer = document.getElementById("admin-login-container");
const adminContent = document.getElementById("admin-content");
const adminContainer = document.getElementById("admin-container");
const toast = document.getElementById("toast");

// State
let currentPage = "upload";
let isAdmin = false;
const ADMIN_PASSWORD = "admin123";
let voteUpdateInterval = null;
let adminUpdateInterval = null;

// Navigation
navLinks.forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const targetPage = link.getAttribute("data-page");
    changePage(targetPage);
  });
});

function changePage(pageName) {
  // Update navigation
  navLinks.forEach((link) => {
    if (link.getAttribute("data-page") === pageName) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });

  // Update page visibility
  pages.forEach((page) => {
    if (page.id === `${pageName}-page`) {
      page.classList.add("active");
    } else {
      page.classList.remove("active");
    }
  });

  currentPage = pageName;

  // Clear any existing update intervals
  if (voteUpdateInterval) {
    clearInterval(voteUpdateInterval);
    voteUpdateInterval = null;
  }

  if (adminUpdateInterval) {
    clearInterval(adminUpdateInterval);
    adminUpdateInterval = null;
  }

  // Load content based on page
  if (pageName === "upload") {
    // Load uploaded images when on upload page
    loadUploadedImages();

    // Set up interval to refresh uploaded images
    voteUpdateInterval = setInterval(() => {
      if (currentPage === "upload") {
        loadUploadedImages();
      }
    }, 300000000); // Update every 3 seconds
  } else if (pageName === "vote") {
    loadVoteContent();
    // Set up live updates for vote page
    voteUpdateInterval = setInterval(() => {
      if (currentPage === "vote") {
        // Update both vote content and results
        loadVoteContent();
        loadVoteResults();
      }
    }, 300000000); // Update every 3 seconds
  } else if (pageName === "admin") {
    if (isAdmin) {
      loadAdminContent();
      // Set up live updates for admin page with both content and vote updates
      adminUpdateInterval = setInterval(() => {
        if (currentPage === "admin" && isAdmin) {
          loadAdminContent();
        }
      }, 300000000); // Update every 3 seconds
    }
  }
}

// Image Preview
if (prompterImage) {
  prompterImage.addEventListener("change", function () {
    previewImage(this, preview);
  });
}

function previewImage(input, previewElement) {
  const file = input.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      const previewImg = previewElement.querySelector(".preview-img");
      const placeholder = previewElement.querySelector(
        ".file-preview-placeholder"
      );

      previewImg.src = e.target.result;
      previewImg.style.display = "block";
      if (placeholder) {
        placeholder.style.display = "none";
      }
    };
    reader.readAsDataURL(file);
  }
}

// Load uploaded images
function loadUploadedImages() {
  fetch("/api/images")
    .then((response) => response.json())
    .then((images) => {
      renderUploadedImages(images);
    })
    .catch((error) => {
      console.error("Error loading uploaded images:", error);
      showToast("Error loading uploaded images");
    });
}

// Render uploaded images
function renderUploadedImages(images) {
  if (!uploadedImagesContainer) return;

  if (images.length === 0) {
    uploadedImagesContainer.innerHTML = `
      <div class="empty-state">
        <p>No images uploaded yet</p>
      </div>
    `;
    return;
  }

  let imagesHTML = "";

  images.forEach((image) => {
    imagesHTML += `
      <div class="uploaded-image-item">
        ${
          image.url || image.path
            ? `<img src="${image.url || image.path}" alt="${
                image.prompter
              }'s image" class="uploaded-image">`
            : `<div class="file-preview-placeholder uploaded-image">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
            <span>No image</span>
          </div>`
        }
        <div class="uploaded-image-info">
          <div class="uploaded-prompter">Prompter: ${image.prompter}</div>
          <div class="uploaded-votes">Votes: ${image.votes || 0}</div>
        </div>
      </div>
    `;
  });

  uploadedImagesContainer.innerHTML = imagesHTML;
}

// Form Submission
if (uploadForm) {
  uploadForm.addEventListener("submit", function (e) {
    e.preventDefault();

    // Check if we already have 2 images
    fetch("/api/images")
      .then((response) => response.json())
      .then((images) => {
        if (images.length >= 2) {
          showToast(
            "Maximum of 2 images already uploaded. Please delete an image before uploading a new one."
          );
          return;
        }

        const formData = new FormData(this);
        // Use a generic prompter number based on how many images are already uploaded
        const prompterNumber = images.length + 1;
        formData.append("prompterNumber", prompterNumber.toString());
        uploadImage(formData);
      })
      .catch((error) => {
        console.error("Error checking existing images:", error);
        showToast("Error checking existing images");
      });
  });
}

async function uploadImage(formData) {
  try {
    // FIX: Use the correct API endpoint
    const response = await fetch(`/api/upload`, {
      method: "POST",
      body: formData,
    });

    // FIX: Handle non-JSON responses
    if (response.ok) {
      let data;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        // Handle non-JSON response
        const text = await response.text();
        console.log("Non-JSON response:", text);
        data = { success: true };
      }

      showToast(`Image uploaded successfully`);

      // Reset form
      uploadForm.reset();
      resetPreview(preview);

      // Load uploaded images
      loadUploadedImages();

      // Refresh content if on vote page
      if (currentPage === "vote") {
        loadVoteContent();
      }
    } else {
      // FIX: Handle error responses more robustly
      try {
        const error = await response.json();
        showToast(`Error: ${error.message || error.error || "Upload failed"}`);
      } catch (jsonError) {
        const text = await response.text();
        console.error("Error response (not JSON):", text);
        showToast(`Error: Upload failed (${response.status})`);
      }
    }
  } catch (error) {
    showToast("Error uploading image. Please try again.");
    console.error("Upload error:", error);
  }
}

function resetPreview(previewElement) {
  const previewImg = previewElement.querySelector(".preview-img");
  const placeholder = previewElement.querySelector(".file-preview-placeholder");

  previewImg.src = "";
  previewImg.style.display = "none";
  placeholder.style.display = "flex";
}

// Gallery page removed as requested

// Voting
async function loadVoteContent() {
  try {
    const response = await fetch("/api/images");
    if (response.ok) {
      // FIX: Handle non-JSON responses
      try {
        const images = await response.json();
        renderVoteContent(images);
        loadVoteResults();
      } catch (jsonError) {
        console.error("JSON parsing error:", jsonError);
        showToast("Error parsing voting data");
      }
    } else {
      showToast("Error loading images for voting");
    }
  } catch (error) {
    console.error("Vote content error:", error);
    showToast("Error connecting to server");
  }
}

function renderVoteContent(images) {
  if (!voteContainer) return;

  if (images.length === 0) {
    voteContainer.innerHTML = `
      <div class="empty-state">
        <p>No images to vote on yet</p>
        <a href="#" class="btn btn-secondary" data-page="upload">Upload Images</a>
      </div>
    `;

    // Add event listener to the upload button
    const uploadBtn = voteContainer.querySelector('[data-page="upload"]');
    if (uploadBtn) {
      uploadBtn.addEventListener("click", (e) => {
        e.preventDefault();
        changePage("upload");
      });
    }
    return;
  }

  let voteHTML = "";

  // Display all available images for voting
  images.forEach((image) => {
    voteHTML += `
      <div class="vote-card" data-id="${image.id}">
        <button class="btn btn-vote vote-button" data-id="${
          image.id
        }">Vote</button>
        ${
          image.url
            ? `<img src="${image.url}" alt="${image.prompter}'s image" class="vote-image">`
            : `<div class="file-preview-placeholder vote-image">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
            <span>No image</span>
          </div>`
        }
        <div class="vote-info">
          <div class="vote-prompter">Prompter: ${image.prompter}</div>
          ${
            image.prompt
              ? `<div class="prompt-text"><span class="prompt-label">Prompt:</span>${image.prompt}</div>`
              : ""
          }

        </div>
      </div>
    `;
  });

  voteContainer.innerHTML = voteHTML;

  // Add event listeners to vote buttons
  const voteButtons = voteContainer.querySelectorAll(".vote-button");
  voteButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const imageId = this.getAttribute("data-id");
      submitVote(imageId);
    });
  });
}

async function submitVote(imageId) {
  try {
    // FIX: Use the correct API endpoint
    const response = await fetch(`/api/vote/${imageId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ imageId }),
    });

    if (response.ok) {
      showToast("Vote submitted successfully!");
      loadVoteResults();
    } else {
      // FIX: Handle error responses more robustly
      try {
        const error = await response.json();
        showToast(`Error: ${error.message || error.error || "Vote failed"}`);
      } catch (jsonError) {
        showToast(`Error: Vote failed (${response.status})`);
      }
    }
  } catch (error) {
    console.error("Vote submission error:", error);
    showToast("Error connecting to server");
  }
}

async function loadVoteResults() {
  try {
    const response = await fetch("/api/images");
    if (response.ok) {
      // FIX: Handle non-JSON responses
      try {
        const images = await response.json();
        renderVoteResults(images);
      } catch (jsonError) {
        console.error("JSON parsing error:", jsonError);
        showToast("Error parsing vote results");
      }
    } else {
      showToast("Error loading vote results");
    }
  } catch (error) {
    console.error("Vote results error:", error);
    showToast("Error connecting to server");
  }
}

function renderVoteResults(results) {
  if (!resultsContainer) return;

  if (results.length === 0) {
    resultsContainer.innerHTML = "<p>No votes yet</p>";
    return;
  }

  // Calculate total votes
  const totalVotes = results.reduce((sum, result) => sum + result.votes, 0);

  let resultsHTML = "";

  results.forEach((result) => {
    const percentage =
      totalVotes > 0 ? Math.round((result.votes / totalVotes) * 100) : 0;

    resultsHTML += `
      <div class="result-item">
        <div class="result-info">
          <div class="result-prompter">${result.prompter}</div>
          <div class="result-bar-container">
            <div class="result-bar" style="width: ${percentage}%"></div>
          </div>
        </div>
        <div class="result-votes">${percentage}% (${result.votes} votes)</div>
      </div>
    `;
  });

  resultsContainer.innerHTML = resultsHTML;
}

// Admin
if (adminLoginForm) {
  adminLoginForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const password = document.getElementById("admin-password").value;

    if (password === ADMIN_PASSWORD) {
      isAdmin = true;
      adminLoginContainer.style.display = "none";
      adminContent.style.display = "block";
      loadAdminContent();
      showToast("Admin login successful");
    } else {
      showToast("Incorrect password");
    }
  });
}

async function loadAdminContent() {
  try {
    const response = await fetch("/api/images");
    if (response.ok) {
      // FIX: Handle non-JSON responses
      try {
        const images = await response.json();
        renderAdminContent(images);
      } catch (jsonError) {
        console.error("JSON parsing error:", jsonError);
        showToast("Error parsing admin data");
      }
    } else {
      showToast("Error loading images for admin");
    }
  } catch (error) {
    console.error("Admin content error:", error);
    showToast("Error connecting to server");
  }
}

function renderAdminContent(images) {
  if (!adminContainer) return;

  // Add admin actions navigation at the top
  let adminHTML = `
    <div class="admin-actions-nav">
      <div class="admin-actions-buttons">
        <button class="btn btn-secondary reset-votes-prompter1-btn">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
            <path d="M3 3v5h5"></path>
          </svg>
          Reset Prompter 1 Votes
        </button>
        <button class="btn btn-secondary reset-votes-prompter2-btn">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
            <path d="M3 3v5h5"></path>
          </svg>
          Reset Prompter 2 Votes
        </button>
        <button class="btn btn-secondary delete-all-btn">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
          Delete All Images
        </button>
        <a href="/fullscreen.html" class="btn btn-primary fullscreen-btn" target="_blank">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
          </svg>
          Fullscreen Presentation
        </a>
      </div>
    </div>
  `;

  if (images.length === 0) {
    adminHTML += `
      <div class="empty-state">
        <p>No images to manage</p>
      </div>
    `;

    adminContainer.innerHTML = adminHTML;

    // Add event listeners to reset buttons
    const resetPrompter1Btn = adminContainer.querySelector(
      ".reset-votes-prompter1-btn"
    );
    const resetPrompter2Btn = adminContainer.querySelector(
      ".reset-votes-prompter2-btn"
    );
    const deleteAllBtn = adminContainer.querySelector(".delete-all-btn");

    if (resetPrompter1Btn) {
      resetPrompter1Btn.addEventListener("click", () => resetPrompterVotes(1));
    }

    if (resetPrompter2Btn) {
      resetPrompter2Btn.addEventListener("click", () => resetPrompterVotes(2));
    }

    if (deleteAllBtn) {
      deleteAllBtn.addEventListener("click", deleteAllImages);
    }

    return;
  }

  images.forEach((image) => {
    adminHTML += `
      <div class="admin-card">
        ${
          image.url || image.path
            ? `<img src="${image.url || image.path}" alt="${
                image.prompter
              }'s image" class="admin-image">`
            : `<div class="file-preview-placeholder admin-image">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
            <span>No image</span>
          </div>`
        }
        <div class="admin-info">
          <div class="admin-prompter">Prompter: ${image.prompter}</div>
          <div>Votes: ${image.votes || 0}</div>
        </div>
        <div class="admin-actions">
          <button class="btn btn-delete delete-image-btn" data-id="${image.id}">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
            Delete
          </button>
        </div>
      </div>
    `;
  });

  adminContainer.innerHTML = adminHTML;

  // Add event listeners to delete buttons
  const deleteButtons = adminContainer.querySelectorAll(".delete-image-btn");
  deleteButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const imageId = this.getAttribute("data-id");
      deleteImage(imageId);
    });
  });

  // Add event listeners to reset buttons
  const resetPrompter1Btn = adminContainer.querySelector(
    ".reset-votes-prompter1-btn"
  );
  const resetPrompter2Btn = adminContainer.querySelector(
    ".reset-votes-prompter2-btn"
  );
  const deleteAllBtn = adminContainer.querySelector(".delete-all-btn");

  if (resetPrompter1Btn) {
    resetPrompter1Btn.addEventListener("click", () => resetPrompterVotes(1));
  }

  if (resetPrompter2Btn) {
    resetPrompter2Btn.addEventListener("click", () => resetPrompterVotes(2));
  }

  if (deleteAllBtn) {
    deleteAllBtn.addEventListener("click", deleteAllImages);
  }
}

async function deleteImage(imageId) {
  try {
    // FIX: Use the correct API endpoint
    const response = await fetch(`/api/delete/${imageId}`, {
      method: "DELETE",
    });

    if (response.ok) {
      showToast("Image deleted successfully");
      loadAdminContent();

      // Update all sections regardless of current page
      // This ensures synchronization across all sections
      if (currentPage === "vote") {
        loadVoteContent();
        loadVoteResults();
      }
    } else {
      // FIX: Handle error responses more robustly
      try {
        const error = await response.json();
        showToast(`Error: ${error.message || error.error || "Delete failed"}`);
      } catch (jsonError) {
        showToast(`Error: Delete failed (${response.status})`);
      }
    }
  } catch (error) {
    console.error("Delete image error:", error);
    showToast("Error connecting to server");
  }
}

// New function to reset votes for a specific prompter
async function resetPrompterVotes(prompterNumber) {
  if (
    confirm(
      `Are you sure you want to reset votes for Prompter ${prompterNumber}? This cannot be undone.`
    )
  ) {
    try {
      const response = await fetch(`/api/reset-prompter/${prompterNumber}`, {
        method: "POST",
      });

      if (response.ok) {
        showToast(`Votes for Prompter ${prompterNumber} have been reset`);
        loadAdminContent();

        // If on vote page, refresh vote content
        if (currentPage === "vote") {
          loadVoteContent();
        }
      } else {
        // Handle error responses
        try {
          const error = await response.json();
          showToast(`Error: ${error.message || error.error || "Reset failed"}`);
        } catch (jsonError) {
          showToast(`Error: Reset failed (${response.status})`);
        }
      }
    } catch (error) {
      console.error("Reset error:", error);
      showToast("Error connecting to server");
    }
  }
}

// New function to delete all images
async function deleteAllImages() {
  if (
    confirm(
      "Are you sure you want to delete all images? This cannot be undone."
    )
  ) {
    try {
      const response = await fetch("/api/reset", {
        method: "POST",
      });

      if (response.ok) {
        showToast("All images have been deleted");
        loadAdminContent();

        // Update all sections regardless of current page
        // This ensures synchronization across all sections
        if (currentPage === "vote") {
          loadVoteContent();
          loadVoteResults();
        }
      } else {
        // Handle error responses
        try {
          const error = await response.json();
          showToast(
            `Error: ${error.message || error.error || "Delete failed"}`
          );
        } catch (jsonError) {
          showToast(`Error: Delete failed (${response.status})`);
        }
      }
    } catch (error) {
      console.error("Delete all error:", error);
      showToast("Error connecting to server");
    }
  }
}

// Toast Notification
function showToast(message) {
  const toastMessage = toast.querySelector(".toast-message");
  toastMessage.textContent = message;

  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  // FIX: Properly handle file input clicks to prevent double-opening
  const filePreviewAreas = document.querySelectorAll(".file-preview");
  filePreviewAreas.forEach((area) => {
    const fileInput = area
      .closest(".file-input-container")
      .querySelector('input[type="file"]');
    if (fileInput) {
      area.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        fileInput.click();
      });
    }
  });

  // Add click event listeners to page links in empty states
  document.querySelectorAll("[data-page]").forEach((link) => {
    if (!link.classList.contains("nav-link")) {
      // Skip nav links as they're already handled
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const targetPage = link.getAttribute("data-page");
        changePage(targetPage);
      });
    }
  });
});
