import React from 'react';
import './App.css';
import { ItemList } from './components/ItemList';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>My Simple App</h1>
      </header>
      <main>
        <ItemList />
      </main>
    </div>
  );
}

export default App;