document.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('.container');
  const trailContainer = document.createElement('div');
  trailContainer.classList.add('logo-trail');
  container.appendChild(trailContainer);

  let lastPosition = { x: 0, y: 0 };
  let lastImageChangePosition = { x: 0, y: 0 };
  let cumulativeDistance = 0; // Track total distance since last image change
  let currentImageIndex = 0;
  let lastTrailTime = 0;
  let mainImage = null;
  let isInitialized = false;
  let trailCount = 0;
  let lastUpdateTime = 0;
  let isFCycling = false; // Track if 'F' is held
  let cycleInterval = null; // Interval for holding 'F'
  const MAX_TRAILS = 5; // Limit simultaneous trail elements
  let pendingMove = null; // Store latest move event
  let originalImageUrls = []; // Store original image URLs
  
  const IMAGE_CHANGE_DISTANCE = 200; // Fixed distance for image change
  const TRAIL_DELAY = window.innerWidth < 768 ? 200 : 250; // Balanced for smoothness
  const CYCLE_INTERVAL = 300; // Delay for holding 'F' (ms)
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
      const hostname = parsed.hostname.replace('www.', '');
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
    originalImageUrls = [];

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
        originalImageUrls.push(...imageBlocks.map(block => block.image.original.url));
        hasMorePages = data.contents.length === perPage;
        page++;
      } catch (error) {
        console.error("Fetch Error:", error);
        return false;
      }
    }

    if (images.length > 0) {
      // Preload images and ensure original URLs are synced
      images.forEach(url => {
        const img = new Image();
        img.src = url;
      });
      shuffleArrays(images, originalImageUrls); // Shuffle both arrays in sync
      return true;
    }
    console.error("No images found");
    return false;
  }

  function shuffleArrays(array1, array2) {
    for (let i = array1.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array1[i], array1[j]] = [array1[j], array1[i]];
      [array2[i], array2[j]] = [array2[j], array2[i]];
    }
  }

  function initializeCursorImage() {
    if (!images.length) return;
    
    if (!mainImage) {
      mainImage = document.createElement('img');
      mainImage.classList.add('cursor-image');
      mainImage.style.position = 'absolute';
      mainImage.style.mask = 
        'linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)';
      mainImage.style.webkitMask = 
        'linear-gradient(to right, 0%, black 5%, black 95%, transparent 100%)';
      mainImage.style.transition = 
        'transform 0.1s linear'; // Faster transition for responsiveness
      container.appendChild(mainImage);
    }

    mainImage.src = images[currentImageIndex];

    if (!isInitialized) {
      const initialX = container.clientWidth / 2 - mainImage.clientWidth / 2;
      const initialY = container.clientHeight / 2 - mainImage.clientHeight / 2;
      
      mainImage.style.transform = 
        `translate(${initialX}px, ${initialY}px) scale(0)`;
      setTimeout(() => {
        mainImage.style.transform = 
          `translate(${initialX}px, ${initialY}px) scale(1)`;
      }, 100);

      // Add event listeners
      container.addEventListener('mousemove', queueMove);
      container.addEventListener('touchstart', handleTouchStart, { passive: false });
      container.addEventListener('touchmove', queueMove, { passive: false });
      container.addEventListener('touchend', handleTouchEnd);
      // Add keyboard listeners for spacebar and 'F'
      document.addEventListener('keydown', handleKeydown);
      document.addEventListener('keyup', handleKeyup);
      isInitialized = true;
    }

    lastPosition = { x: initialX, y: initialY };
    lastImageChangePosition = { x: initialX, y: initialY };
    cumulativeDistance = 0; // Initialize cumulative distance
  }

  function cycleBackward() {
    if (!images.length) return;
    currentImageIndex = (currentImageIndex - 1 + images.length) % images.length; // Decrement with wrap-around
    mainImage.src = images[currentImageIndex];
  }

  async function downloadCurrentImage() {
    if (!images.length || currentImageIndex >= originalImageUrls.length) {
      alert('No image available to download.');
      return;
    }

    const url = originalImageUrls[currentImageIndex];
    try {
      // Fetch image as blob
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const blob = await response.blob();

      // Extract filename from URL or use fallback
      const filename = url.split('/').pop().split('?')[0] || `image-${currentImageIndex}`;

      // Create object URL and trigger download
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Download Error:', error);
      alert('Failed to download the image. Please try again.');
    }
  }

  function handleKeydown(event) {
    if (window.innerWidth < 768) return; // Restrict to desktop

    if (event.key === ' ') {
      event.preventDefault(); // Prevent scrolling
      downloadCurrentImage();
    } else if (event.key.toLowerCase() === 'f' && !isFCycling) {
      event.preventDefault(); // Prevent browser actions
      isFCycling = true;
      cycleBackward(); // Immediate cycle on press
      cycleInterval = setInterval(cycleBackward, CYCLE_INTERVAL); // Start cycling for hold
    }
  }

  function handleKeyup(event) {
    if (window.innerWidth < 768) return; // Restrict to desktop

    if (event.key.toLowerCase() === 'f') {
      isFCycling = false;
      clearInterval(cycleInterval); // Stop cycling
      cycleInterval = null;
    }
  }

  function createTrailElement(x, y) {
    if (trailCount >= MAX_TRAILS) return;
    trailCount++;

    const trail = document.createElement('img');
    trail.src = images[currentImageIndex];
    trail.classList.add('trail-element');
    trail.style.position = 'absolute';
    trail.style.transform = `translate(${x}px, ${y}px) scale(0)`;
    trail.style.opacity = '1';
    trail.style.transition = 
      'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease';
    
    trailContainer.appendChild(trail);
    
    setTimeout(() => {
      trail.style.transform = `translate(${x}px, ${y}px) scale(1)`;
    }, 50);
    
    setTimeout(() => {
      trail.style.opacity = '0';
      setTimeout(() => {
        trailContainer.removeChild(trail);
        trailCount--;
      }, 300);
    }, 500); // Total duration: 800ms
  }

  function queueMove(event) {
    event.preventDefault();
    pendingMove = event; // Store latest event
    if (!lastUpdateTime) {
      requestAnimationFrame(updatePosition);
    }
  }

  function updatePosition(timestamp) {
    if (!pendingMove) {
      lastUpdateTime = 0;
      return;
    }

    lastUpdateTime = timestamp;
    const event = pendingMove;
    pendingMove = null;

    const isTouch = event.type === 'touchmove';
    const clientX = isTouch ? event.touches[0].clientX : event.clientX;
    const clientY = isTouch ? event.touches[0].clientY : event.clientY;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const imageWidth = mainImage.clientWidth;
    const imageHeight = mainImage.clientHeight;
    const rect = container.getBoundingClientRect();
    
    const cursorX = clientX - rect.left - imageWidth / 2;
    const cursorY = clientY - rect.top - imageHeight / 2;
    
    const maxX = containerWidth - imageWidth;
    const maxY = containerHeight - imageHeight;
    const constrainedX = Math.max(0, Math.min(cursorX, maxX));
    const constrainedY = Math.max(0, Math.min(cursorY, maxY));

    // Update main image position immediately
    mainImage.style.transform = 
      `translate(${constrainedX}px, ${constrainedY}px) scale(1)`;

    // Calculate distance moved since last position
    const deltaDistance = Math.sqrt(
      Math.pow(constrainedX - lastPosition.x, 2) +
      Math.pow(constrainedY - lastPosition.y, 2)
    );
    cumulativeDistance += deltaDistance;

    if (cumulativeDistance >= IMAGE_CHANGE_DISTANCE) {
      currentImageIndex = (currentImageIndex + 1) % images.length; // Forward cycle
      mainImage.src = images[currentImageIndex];
      lastImageChangePosition = { x: constrainedX, y: constrainedY };
      cumulativeDistance = 0; // Reset cumulative distance
    }

    const currentTime = Date.now();
    if (currentTime - lastTrailTime >= TRAIL_DELAY) {
      createTrailElement(constrainedX, constrainedY);
      lastTrailTime = currentTime;
    }

    lastPosition = { x: constrainedX, y: constrainedY };

    // Schedule next update if more events are pending
    if (pendingMove) {
      requestAnimationFrame(updatePosition);
    } else {
      lastUpdateTime = 0;
    }
  }

  function handleTouchStart(event) {
    event.preventDefault();
    const touch = event.touches[0];
    queueMove({ type: 'touchmove', touches: [{ clientX: touch.clientX, clientY: touch.clientY }] });
  }

  function handleTouchEnd(event) {
    lastTrailTime = 0;
    pendingMove = null;
    lastUpdateTime = 0;
  }

  // Channel change handler
  document.getElementById('change-channel-btn').addEventListener('click', async () => {
    const input = document.getElementById('channel-url');
    const url = input.value.trim();
    const slug = extractChannelSlug(url);
    
    if (!slug) {
      alert('Paste an Are.na channel link to switch channels.');
      return;
    }

    input.value = formatDisplayUrl(url);

    currentImageIndex = 0;
    trailCount = 0;
    cumulativeDistance = 0; // Reset cumulative distance
    isFCycling = false; // Reset cycling state
    clearInterval(cycleInterval); // Stop any ongoing cycling
    cycleInterval = null;
    document.querySelectorAll('.trail-element').forEach(el => {
      trailContainer.removeChild(el);
    });
    
    const success = await fetchAllImages(slug);
    if (success) {
      initializeCursorImage();
    } else {
      alert('Failed to load images for this channel.');
    }
  });

  // Initial load with default channel
  (async () => {
    document.getElementById('channel-url').value = DEFAULT_DISPLAY_URL;
    
    const success = await fetchAllImages(DEFAULT_SLUG);
    if (success) {
      initializeCursorImage();
    }
  })();

  // Select the input element
  const channelInput = document.getElementById('channel-url');

  // Function to update placeholder based on window width
  function updatePlaceholder() {
    if (window.innerWidth < 768) {
      channelInput.placeholder = 'Paste link';
    } else {
      channelInput.placeholder = 'Paste Are.na channel link';
    }
  }

  // Run on page load
  updatePlaceholder();

  // Run when window is resized
  window.addEventListener('resize', updatePlaceholder);
});
