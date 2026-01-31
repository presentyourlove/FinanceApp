// Observer Pattern for Data Changes
type DataChangeListener = () => void;
const listeners: DataChangeListener[] = [];

export const addDataChangeListener = (listener: DataChangeListener) => {
    if (!listeners.includes(listener)) {
        listeners.push(listener);
    }
};

export const removeDataChangeListener = (listener: DataChangeListener) => {
    const index = listeners.indexOf(listener);
    if (index > -1) {
        listeners.splice(index, 1);
    }
};

export const notifyListeners = () => {
    listeners.forEach(listener => listener());
};
