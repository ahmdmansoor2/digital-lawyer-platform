import React from 'react';
import { renderToString } from 'react-dom/server';
import UsersManagement from './src/components/UsersManagement';
import { AuthProvider } from './src/contexts/AuthContext';

// Minimal harness: wrap UsersManagement in AuthProvider and render
try {
  const html = renderToString(
    React.createElement(AuthProvider, null, React.createElement(UsersManagement))
  );
  console.log('RENDER OK, length:', html.length);
  console.log(html.substring(0, 500));
} catch (e) {
  console.error('RENDER ERROR:', e.message);
  console.error(e.stack);
}
