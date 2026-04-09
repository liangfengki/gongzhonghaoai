import { generateHTML } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
console.log(generateHTML({
  type: 'doc',
  content: [
    {
      type: 'image',
      attrs: {
        src: 'placeholder',
        alt: 'IMAGE_PROMPT: test'
      }
    }
  ]
}, [StarterKit, Image]));
