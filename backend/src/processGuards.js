process.on('uncaughtException', (error) => {
  console.error('[fatal] uncaughtException', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('[fatal] unhandledRejection', reason);
});
