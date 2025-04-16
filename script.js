document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('.container');
  const trailContainer = document.createElement('div');
  trailContainer.classList.add('logo-trail');
  container.appendChild(trailContainer);

  let lastPosition = { x: 0, y: 0 };
  let lastImageChangePosition = { x: 0, y: 0 };
  let currentImageIndex = 0;
  let lastTrailTime = 0;
  let mainImage = null;
  let isInitialized = false;
  
  const TRAIL_DELAY = 200;
  const IMAGE_CHANGE_DISTANCE = 200;
  let images = [];

  // Default channel setup
  const DEFAULT_CHANNEL_URL = "https://www.are.na/bence-ivanyi-zq-mjjo1hzo/it-s-like-the-rick-and-virgil-of-graphics";
  const DEFAULT_SLUG = "it-s-like-the-rick-and-virgil-of-graphics";
  const DEFAULT_DISPLAY_URL = "are.na/bence-ivanyi-zq-mjjo1hzo/it-s-like-the-rick-and-virgil-of-graphics";

  function extractChannelSlug(url) {
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      const pathParts = parsed.pathname.split('/').filter(p => p);
      return pathParts.length >= 2 ? pathParts[pathParts.length - 1] : null;
    } catch {
      return null;
    }
  }

  function formatDisplayUrl(url) {
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      const hostname = parsed.hostname.replace('www.', ''); // Remove "www." prefix
      return `${hostname}${parsed.pathname}`;
    } catch {
      return url;
    }
  }

  async function fetchAllImages(slug) {
    let page = 1;
    const perPage = 100;
    let hasMorePages = true;
    
    images = [];

    while (hasMorePages) {
      try {
        const response = await fetch(
          `https://api.are.na/v2/channels/${slug}/contents?page=${page}&per=${perPage}`
        );
        const data = await response.json();
        
        if (data.message) {
          console.error("API Error:", data.message);
          return false;
        }

        const imageBlocks = data.contents.filter(
          block => block.image?.original?.url
        );
        images.push(...imageBlocks.map(block => block.image.original.url));
        hasMorePages = data.contents.length === perPage;
        page++;
      } catch (error) {
        console.error("Fetch Error:", error);
        return false;
      }
    }

    if (images.length > 0) {
      shuffleArray(images);
      return true;
    }
    console.error("No images found");
    return false;
  }

  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  function initializeCursorImage() {
    if (!images.length) return;
    
    if (mainImage) {
      mainImage.remove();
    }

    mainImage = document.createElement('img');
    mainImage.src = images[currentImageIndex];
    mainImage.classList.add('cursor-image');
    mainImage.style.width = '20vw';
    mainImage.style.height = '20vw';
    mainImage.style.position = 'absolute';
    mainImage.style.mask = 
      'linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)';
    mainImage.style.webkitMask = 
      'linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)';
    mainImage.style.transition = 
      'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)';
    
    container.appendChild(mainImage);

    if (!isInitialized) {
      const initialX = container.clientWidth/2 - mainImage.clientWidth/2;
      const initialY = container.clientHeight/2 - mainImage.clientHeight/2;
      
      mainImage.style.transform = 
        `translate(${initialX}px, ${initialY}px) scale(0)`;
      setTimeout(() => {
        mainImage.style.transform = 
          `translate(${initialX}px, ${initialY}px) scale(1)`;
      }, 100);

      container.addEventListener('mousemove', updatePosition);
      isInitialized = true;
    }

    lastPosition = { x: initialX, y: initialY };
    lastImageChangePosition = { x: initialX, y: initialY };
  }

  function createTrailElement(x, y) {
    const trail = document.createElement('img');
    trail.src = images[currentImageIndex];
    trail.classList.add('trail-element');
    trail.style.width = '20vw';
    trail.style.height = '20vw';
    trail.style.position = 'absolute';
    trail.style.transform = `translate(${x}px, ${y}px) scale(0)`;
    trail.style.opacity = '1';
    trail.style.transition = 
      'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease';
    
    trailContainer.appendChild(trail);
    
    setTimeout(() => {
      trail.style.transform = `translate(${x}px, ${y}px) scale(1)`;
    }, 50);
    
    setTimeout(() => {
      trail.style.opacity = '0';
      setTimeout(() => {
        trailContainer.removeChild(trail);
      }, 400);
    }, 1000);
  }

  function updatePosition(event) {
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const imageWidth = mainImage.clientWidth;
    const imageHeight = mainImage.clientHeight;
    const rect = container.getBoundingClientRect();
    
    const cursorX = event.clientX - rect.left - imageWidth/2;
    const cursorY = event.clientY - rect.top - imageHeight/2;
    
    const maxX = containerWidth - imageWidth;
    const maxY = containerHeight - imageHeight;
    const constrainedX = Math.max(0, Math.min(cursorX, maxX));
    const constrainedY = Math.max(0, Math.min(cursorY, maxY));

    const distanceMoved = Math.sqrt(
      Math.pow(constrainedX - lastImageChangePosition.x, 2) +
      Math.pow(constrainedY - lastImageChangePosition.y, 2)
    );

    if (distanceMoved > IMAGE_CHANGE_DISTANCE) {
      currentImageIndex = (currentImageIndex + 1) % images.length;
      mainImage.src = images[currentImageIndex];
      
      const offsetX = (Math.random() - 0.5) * 400;
      const offsetY = (Math.random() - 0.5) * 400;
      const newX = Math.max(0, Math.min(constrainedX + offsetX, maxX));
      const newY = Math.max(0, Math.min(constrainedY + offsetY, maxY));
      
      mainImage.style.transform = 
        `translate(${newX}px, ${newY}px) scale(0)`;
      setTimeout(() => {
        mainImage.style.transform = 
          `translate(${newX}px, ${newY}px) scale(1)`;
      }, 50);
      
      lastImageChangePosition = { x: constrainedX, y: constrainedY };
    } else {
      mainImage.style.transform = 
        `translate(${constrainedX}px, ${constrainedY}px) scale(1)`;
    }

    const currentTime = Date.now();
    if (currentTime - lastTrailTime >= TRAIL_DELAY) {
      createTrailElement(constrainedX, constrainedY);
      lastTrailTime = currentTime;
    }

    lastPosition = { x: constrainedX, y: constrainedY };
  }

  // Channel change handler
  document.getElementById('change-channel-btn').addEventListener('click', async () => {
    const input = document.getElementById('channel-url');
    const url = input.value.trim();
    const slug = extractChannelSlug(url);
    
    if (!slug) {
      alert('Please enter a valid Are.na channel URL.');
      return;
    }

    // Update display to formatted version without "www."
    input.value = formatDisplayUrl(url);

    currentImageIndex = 0;
    document.querySelectorAll('.cursor-image, .trail-element').forEach(el => el.remove());
    
    const success = await fetchAllImages(slug);
    if (success) {
      initializeCursorImage();
    }
  });

  // Initial load with default channel
  (async () => {
    // Pre-fill input field with formatted default URL
    document.getElementById('channel-url').value = DEFAULT_DISPLAY_URL;
    
    // Load default channel
    const success = await fetchAllImages(DEFAULT_SLUG);
    if (success) {
      initializeCursorImage();
    }
  })();
});