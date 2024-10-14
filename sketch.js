// Wait for the DOM to load before executing the script
document.addEventListener('DOMContentLoaded', function () {
  // Get the editor element
  let editor = document.getElementById('editor');

  editor.focus();

  // Listen for input events to process words
  editor.addEventListener('input', processText);

  // Add click event listener to the editor
  editor.addEventListener('click', function (event) {
    let selection = window.getSelection();
    let node = selection.anchorNode;

    if (node && node.parentElement.classList.contains('word')) {
      let wordElement = node.parentElement;
      let word = wordElement.textContent.trim();

      // Check if the word contains only alphabetic characters
      if (/^[a-zA-Z]+$/.test(word)) {
        fetchDefinition(word.toLowerCase(), wordElement);
      } else {
        // Do nothing if it's punctuation or contains non-alphabetic characters
        console.log('Clicked on punctuation or non-alphabetic character.');
      }
    }
  });
});

// Function to save the current selection
function saveSelection(containerEl) {
  let selection = window.getSelection();
  if (selection.rangeCount === 0) return null;
  let range = selection.getRangeAt(0);

  let preSelectionRange = range.cloneRange();
  preSelectionRange.selectNodeContents(containerEl);
  preSelectionRange.setEnd(range.startContainer, range.startOffset);
  let start = preSelectionRange.toString().length;

  let selectedTextLength = range.toString().length;

  return {
    start: start,
    end: start + selectedTextLength,
  };
}

// Function to restore the selection
function restoreSelection(containerEl, savedSel) {
  if (!savedSel) return;

  let charIndex = 0;
  let range = document.createRange();
  range.setStart(containerEl, 0);
  range.collapse(true);
  let nodeStack = [containerEl];
  let node, foundStart = false, stop = false;

  while (!stop && (node = nodeStack.pop())) {
    if (node.nodeType === 3) {
      let nextCharIndex = charIndex + node.length;
      if (!foundStart && savedSel.start >= charIndex && savedSel.start <= nextCharIndex) {
        range.setStart(node, savedSel.start - charIndex);
        foundStart = true;
      }
      if (foundStart && savedSel.end >= charIndex && savedSel.end <= nextCharIndex) {
        range.setEnd(node, savedSel.end - charIndex);
        stop = true;
      }
      charIndex = nextCharIndex;
    } else {
      let i = node.childNodes.length;
      while (i--) {
        nodeStack.push(node.childNodes[i]);
      }
    }
  }

  let sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

// Function to process text and wrap words and punctuation in spans
function processText(event) {
  let editor = event.target;

  // Save the current selection
  let savedSelection = saveSelection(editor);

  // Get the inner HTML of the editor
  let html = editor.innerHTML;

  // Replace <div> with \n for processing
  html = html.replace(/<div>/g, '\n').replace(/<\/div>/g, '');

  // Replace <br> with \n
  html = html.replace(/<br>/g, '\n');

  // Remove any residual HTML tags
  html = html.replace(/<\/?[^>]+(>|$)/g, '');

  // Split the text into words, punctuation, whitespace, and line breaks
  let words = html.match(/(\b\w+\b)|[^\w\s]|\s+|[\n\r]/g) || [];

  // Wrap each word or punctuation in a span
  let newHtml = words
    .map((word) => {
      if (word === '\n' || word === '\r') {
        // Line break
        return '<br>';
      } else if (/\S/.test(word)) {
        // Non-whitespace characters
        if (/^\w+$/.test(word)) {
          // Word
          return `<span class="word">${word}</span>`;
        } else if (/^[^\w\s]+$/.test(word)) {
          // Punctuation
          return `<span class="punctuation">${word}</span>`;
        }
      }
      // Whitespace (spaces, tabs)
      return word;
    })
    .join('');

  // Remove event listener to prevent recursion
  editor.removeEventListener('input', processText);

  // Replace the editor's HTML content
  editor.innerHTML = newHtml;

  // Restore the selection (caret position)
  restoreSelection(editor, savedSelection);

  // Re-attach the event listener
  editor.addEventListener('input', processText);
}

// Function to fetch the definition of a word
function fetchDefinition(word, element) {
  let url = `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`;

  fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error('[No definition found]');
      }
      return response.json();
    })
    .then((data) => {
      let definition = data[0].meanings[0].definitions[0].definition;

      // Process the definition text to get an array of tokens
      let tokens = processDefinitionText(definition);

      // Start the typewriter effect with the tokens
      typeWriterEffect(element, tokens);
    })
    .catch((error) => {
      console.error('Error fetching definition:', error);

      let message = error.message;
      element.innerHTML = '';
      element.classList.add('definition');

      // Display the message
      let messageSpan = document.createElement('span');
      messageSpan.textContent = message;
      messageSpan.className = 'error-message';
      element.appendChild(messageSpan);

      // After 1 second, start erasing the message one letter at a time
      setTimeout(() => {
        eraseTextEffect(messageSpan);
      }, 1000);
    });
}

// Function to process definition text and get array of tokens
function processDefinitionText(definition) {
  // Split the definition into words, punctuation, whitespace
  let words = definition.match(/(\b\w+\b)|[^\w\s]|\s+/g) || [];

  return words;
}

// Function to display the definition with typewriter effect
function typeWriterEffect(element, tokens) {
  element.innerHTML = ''; // Clear the element
  element.classList.add('definition'); // Add the class

  let i = 0;
  let speed = 50; // Adjust the speed (in milliseconds)

  function type() {
    if (i < tokens.length) {
      let token = tokens[i];
      if (token === '\n' || token === '\r') {
        // Line break
        element.appendChild(document.createElement('br'));
      } else if (/\S/.test(token)) {
        // Non-whitespace characters
        let span = document.createElement('span');
        if (/^\w+$/.test(token)) {
          // Word
          span.className = 'word';
        } else if (/^[^\w\s]+$/.test(token)) {
          // Punctuation
          span.className = 'punctuation';
        }
        span.textContent = token;
        element.appendChild(span);
      } else {
        // Whitespace
        element.appendChild(document.createTextNode(token));
      }

      i++;
      setTimeout(type, speed);
    }
  }

  type();
}

// Function to erase text with typewriter effect
function eraseTextEffect(element) {
  let text = element.textContent;
  let length = text.length;
  let i = length - 1;
  let speed = 50; // Adjust the speed of erasing

  function erase() {
    if (i >= 0) {
      element.textContent = text.substring(0, i);
      i--;
      setTimeout(erase, speed);
    } else {
      // When done erasing, remove the element
      element.parentNode.removeChild(element);
    }
  }

  erase();
}
