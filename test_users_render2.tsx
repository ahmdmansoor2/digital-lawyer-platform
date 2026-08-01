import React from 'react';
import { renderToString } from 'react-dom/server';
import UsersManagement from './src/components/UsersManagement';
import { AuthContext } from './src/contexts/AuthContext';
import { buildDefaultAdminUser, buildDemoUsers, buildDefaultRoles, buildDefaultGroups, buildDefaultPermissions } from './src/data/seedAuth';

async function main() {
  const admin = await buildDefaultAdminUser();
  const demo = await buildDemoUsers();
  const users = [admin, ...demo];
  const roles = buildDefaultRoles();
  const groups = buildDefaultGroups();
  const permissions = buildDefaultPermissions();

  const mockContext = {
    users, roles, permissions, groups,
    passwordPolicy: null, loginHistory: [],
    currentUser: admin, context: {}, isInitialized: true,
    isAuthenticated: true, mustChangePassword: false, twoFactorPending: false,
    can: () => true, canAny: () => true, canAll: () => true,
    login: async () => ({}), logout: () => {}, refresh: () => {},
    addUser: () => {}, updateUser: () => {}, deleteUser: () => {},
    addRole: () => {}, updateRole: () => {}, deleteRole: () => {},
    addGroup: () => {}, updateGroup: () => {}, deleteGroup: () => {},
    updatePasswordPolicy: () => {},
  };

  try {
    const html = renderToString(
      React.createElement(AuthContext.Provider, { value: mockContext }, React.createElement(UsersManagement))
    );
    console.log('RENDER OK, length:', html.length);
    console.log(html.substring(0, 800));
  } catch (e) {
    console.error('RENDER ERROR:', e.message);
    console.error(e.stack);
  }
}
main();
