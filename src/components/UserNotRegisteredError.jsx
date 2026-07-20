import React from 'react';

const UserNotRegisteredError = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-paper p-6">
      <div className="max-w-md w-full text-center">
        <h1 className="font-serif text-2xl text-ink mb-4">Acces restreint</h1>
        <p className="text-muted mb-6">
          Vous n'etes pas enregistre pour utiliser cette application.
          Contactez l'administrateur pour obtenir un acces.
        </p>
        <hr className="rule mb-6" />
        <p className="text-faint text-sm">
          Si vous pensez qu'il s'agit d'une erreur, verifiez votre compte ou contactez l'administrateur.
        </p>
      </div>
    </div>
  );
};

export default UserNotRegisteredError;
