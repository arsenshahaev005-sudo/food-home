# Improved Yandex Maps Integration Plan

I will enhance the address selection experience by implementing a custom autocomplete dropdown using the Yandex Maps `suggest` API and improving the interactive map integration.

## Technical Implementation

### 1. Update `MapPicker.tsx`
*   **Extend Types**: Add `suggest` method to the `YMapsApi` type definition.
*   **Expose API**: Add an `onApiReady` prop to pass the loaded `ymaps` instance back to the parent component (`AddressCapsule`).
*   **Cleanup**: Remove the built-in `SuggestView` logic, as we will implement a custom UI for better control and styling.

### 2. Update `AddressCapsule.tsx`
*   **State Management**: Add state for `suggestions` (list of address variants) and `ymapsInstance`.
*   **Custom Autocomplete**:
    *   Implement `fetchSuggestions` using `ymapsInstance.suggest(query)`.
    *   Create a responsive dropdown UI for suggestions that matches the "HomeFood" design (warm colors, soft shadows).
    *   Handle user input with debouncing (optional but good for performance) or direct calls.
*   **Interaction Logic**:
    *   **On Input**: Fetch and display suggestions.
    *   **On Selection**: Update the address field, clear suggestions, and trigger geocoding to update the map marker.
*   **Error Handling**: Add visual feedback if the map API fails to load.

### 3. UI/UX Improvements
*   **Dropdown Design**: Style the suggestion list to float above/below the input, with proper `z-index` and scrolling for mobile compatibility.
*   **Responsiveness**: Ensure the modal and map work smoothly on smaller screens.

## Verification
*   **Autocomplete**: Verify that typing in the address field shows relevant suggestions from Yandex.
*   **Selection**: Verify that clicking a suggestion updates the map center and marker.
*   **Map Interaction**: Verify that clicking the map updates the address field.
*   **Reliability**: Check behavior when the API key is missing or invalid (graceful fallback).
