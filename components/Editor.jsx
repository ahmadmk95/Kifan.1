'use client';

import { useEffect, useRef, useState } from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import {
  ClassicEditor,
  Essentials,
  Paragraph,
  Heading,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Link,
  List,
  BlockQuote,
  Table,
  TableToolbar,
  TableProperties,
  TableCellProperties,
  Image,
  ImageToolbar,
  ImageCaption,
  ImageStyle,
  ImageResize,
  ImageUpload,
  PasteFromOffice,
  SimpleUploadAdapter,
  HorizontalLine,
} from 'ckeditor5';
import arTranslations from 'ckeditor5/translations/ar.js';
import 'ckeditor5/ckeditor5.css';

// Rich-text editor tuned for pasting straight from Microsoft Word:
// PasteFromOffice preserves headings/bold/lists/tables, Table* keep table structure,
// and image paste/upload posts to /api/uploads via SimpleUploadAdapter.
export default function Editor({ value, onChange }) {
  const [mounted, setMounted] = useState(false);
  const dataRef = useRef(value || '');

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="editor-shell" style={{ minHeight: 420 }} />;
  }

  return (
    <div className="editor-shell">
      <CKEditor
        editor={ClassicEditor}
        data={dataRef.current}
        config={{
          licenseKey: 'GPL',
          translations: [arTranslations],
          language: { ui: 'ar', content: 'ar' },
          plugins: [
            Essentials, Paragraph, Heading, Bold, Italic, Underline, Strikethrough,
            Link, List, BlockQuote, HorizontalLine,
            Table, TableToolbar, TableProperties, TableCellProperties,
            Image, ImageToolbar, ImageCaption, ImageStyle, ImageResize, ImageUpload,
            PasteFromOffice, SimpleUploadAdapter,
          ],
          toolbar: [
            'undo', 'redo', '|',
            'heading', '|',
            'bold', 'italic', 'underline', 'strikethrough', '|',
            'link', 'bulletedList', 'numberedList', 'blockQuote', '|',
            'insertTable', 'uploadImage', 'horizontalLine',
          ],
          heading: {
            options: [
              { model: 'paragraph', title: 'نص', class: 'ck-heading_paragraph' },
              { model: 'heading2', view: 'h2', title: 'عنوان 2', class: 'ck-heading_heading2' },
              { model: 'heading3', view: 'h3', title: 'عنوان فرعي 3', class: 'ck-heading_heading3' },
              { model: 'heading4', view: 'h4', title: 'عنوان 4', class: 'ck-heading_heading4' },
            ],
          },
          table: {
            contentToolbar: ['tableColumn', 'tableRow', 'mergeTableCells', 'tableProperties', 'tableCellProperties'],
          },
          image: {
            toolbar: ['imageTextAlternative', 'toggleImageCaption', 'imageStyle:inline', 'imageStyle:block', 'imageStyle:side'],
          },
          simpleUpload: {
            uploadUrl: '/api/uploads',
            withCredentials: true,
          },
        }}
        onChange={(_, editor) => {
          const data = editor.getData();
          dataRef.current = data;
          onChange?.(data);
        }}
      />
    </div>
  );
}
