// ============================================
// Crafting-Panel Komponente
// ============================================

import React, { useState, useMemo } from 'react';
import { getRecipesWithStatus, craft } from '../systems/CraftingSystem';
import { hasTool, hasToolOfTier } from '../systems/ToolSystem';
import items from '../data/items';

const CATEGORIES = [
  { id: 'all', label: 'Alle' },
  { id: 'building', label: 'Gebäude' },
  { id: 'tool', label: 'Werkzeuge' },
  { id: 'food', label: 'Nahrung' },
];

const TYPE_NAMES = { axe: 'Axt', fishing_rod: 'Angel', pickaxe: 'Spitzhacke' };
const TIER_NAMES = { wood: 'Holz', stone: 'Stein', crystal: 'Kristall' };

function getToolRequirement(recipe, tools) {
  if (!recipe.requiresToolType) return null;
  const tierLabel = recipe.requiresToolTier ? TIER_NAMES[recipe.requiresToolTier] : '';
  const toolLabel = `${tierLabel}${TYPE_NAMES[recipe.requiresToolType] || recipe.requiresToolType}`;
  const hasIt = recipe.requiresToolTier
    ? hasToolOfTier(tools, recipe.requiresToolType, recipe.requiresToolTier)
    : hasTool(tools, recipe.requiresToolType);
  return { label: toolLabel, fulfilled: hasIt };
}

export default function CraftingPanel({ gameState, onCraft, onClose }) {
  const [selectedCategory, setSelectedCategory] = useState('all');

  const recipesWithStatus = useMemo(() => {
    return getRecipesWithStatus(gameState);
  }, [gameState]);

  const filteredRecipes = useMemo(() => {
    if (selectedCategory === 'all') return recipesWithStatus;
    return recipesWithStatus.filter(r => r.category === selectedCategory);
  }, [recipesWithStatus, selectedCategory]);

  const handleCraft = (recipe) => {
    const newState = craft(recipe, gameState);
    if (newState) {
      onCraft(newState);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.panel} onClick={e => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Handwerk</h2>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Kategorie-Filter */}
        <div style={styles.categories}>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              style={{
                ...styles.categoryBtn,
                ...(selectedCategory === cat.id ? styles.categoryActive : {}),
              }}
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Rezept-Liste */}
        <div style={styles.recipeList}>
          {filteredRecipes.map(recipe => (
            <div
              key={recipe.id}
              style={{
                ...styles.recipeCard,
                opacity: recipe.craftable.possible ? 1 : 0.6,
              }}
            >
              <div style={styles.recipeHeader}>
                <span style={styles.recipeName}>{recipe.name}</span>
                <span style={styles.recipeCategory}>
                  {recipe.category === 'building' ? '🏠' :
                   recipe.category === 'tool' ? '🔧' :
                   recipe.category === 'food' ? '🍳' : '📦'}
                </span>
              </div>

              <p style={styles.recipeDesc}>{recipe.description}</p>

              {/* Zutaten */}
              <div style={styles.ingredients}>
                {recipe.ingredients.map((ing, i) => {
                  const itemDef = items[ing.itemId];
                  const owned = gameState.inventory[ing.itemId]?.amount || 0;
                  const enough = owned >= ing.amount;

                  return (
                    <div
                      key={i}
                      style={{
                        ...styles.ingredient,
                        color: enough ? '#4ade80' : '#ef4444',
                      }}
                    >
                      <div
                        style={{
                          ...styles.ingredientIcon,
                          backgroundColor: itemDef?.color || '#666',
                        }}
                      />
                      <span>{itemDef?.name || ing.itemId}</span>
                      <span style={styles.ingredientAmount}>
                        {owned}/{ing.amount}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Zusatzanforderungen */}
              {recipe.requiresToolType && (() => {
                const req = getToolRequirement(recipe, gameState.tools);
                return req ? (
                  <div style={styles.requirement}>
                    Benötigt: {req.label}{req.fulfilled ? ' ✓' : ' ✗'}
                  </div>
                ) : null;
              })()}
              {recipe.requiresShelter && (
                <div style={styles.requirement}>
                  Benötigt: Unterstand Lv.{recipe.requiresShelter}
                  {gameState.buildings.shelterLevel >= recipe.requiresShelter ? ' ✓' : ' ✗'}
                </div>
              )}
              {recipe.requiresBuilding === 'campfire' && (
                <div style={styles.requirement}>
                  Benötigt: Lagerfeuer
                  {gameState.buildings.hasCampfire ? ' ✓' : ' ✗'}
                </div>
              )}

              {/* Herstellen-Button */}
              <button
                style={{
                  ...styles.craftBtn,
                  ...(recipe.craftable.possible ? {} : styles.craftBtnDisabled),
                }}
                disabled={!recipe.craftable.possible}
                onClick={() => handleCraft(recipe)}
              >
                {recipe.craftable.possible ? 'Herstellen' : recipe.craftable.reason}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  panel: {
    backgroundColor: '#1a1a2e',
    border: '2px solid #444',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '550px',
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 18px',
    borderBottom: '1px solid #333',
  },
  title: {
    margin: 0,
    color: '#fff',
    fontSize: '18px',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#999',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '4px 8px',
  },
  categories: {
    display: 'flex',
    gap: '6px',
    padding: '10px 14px',
    borderBottom: '1px solid #333',
  },
  categoryBtn: {
    padding: '6px 14px',
    backgroundColor: 'rgba(255,255,255,0.08)',
    color: '#ccc',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
  },
  categoryActive: {
    backgroundColor: '#3498db',
    color: '#fff',
    fontWeight: 'bold',
  },
  recipeList: {
    overflowY: 'auto',
    padding: '10px',
    flex: 1,
  },
  recipeCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: '10px',
    padding: '14px',
    marginBottom: '10px',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  recipeHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px',
  },
  recipeName: {
    color: '#fff',
    fontSize: '15px',
    fontWeight: 'bold',
  },
  recipeCategory: {
    fontSize: '16px',
  },
  recipeDesc: {
    color: '#888',
    fontSize: '12px',
    margin: '4px 0 10px',
  },
  ingredients: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    marginBottom: '8px',
  },
  ingredient: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
    padding: '3px 8px',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: '4px',
  },
  ingredientIcon: {
    width: '12px',
    height: '12px',
    borderRadius: '3px',
  },
  ingredientAmount: {
    fontFamily: 'monospace',
    fontSize: '11px',
  },
  requirement: {
    color: '#f59e0b',
    fontSize: '11px',
    marginBottom: '4px',
  },
  craftBtn: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#27ae60',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    marginTop: '8px',
  },
  craftBtnDisabled: {
    backgroundColor: '#444',
    color: '#888',
    cursor: 'default',
    fontSize: '11px',
  },
};
