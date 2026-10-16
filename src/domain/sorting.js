// mergeSort(items, compare) - stable, returns new array, doesn't modify input
export function mergeSort(items, compare) {
  if (items.length <= 1) return [...items];
  
  const middle = Math.floor(items.length / 2);
  const left = mergeSort(items.slice(0, middle), compare);
  const right = mergeSort(items.slice(middle), compare);
  
  return merge(left, right, compare);
}

function merge(left, right, compare) {
  const result = [];
  let leftIndex = 0;
  let rightIndex = 0;
  
  while (leftIndex < left.length && rightIndex < right.length) {
    const leftItem = left[leftIndex];
    const rightItem = right[rightIndex];
    
    if (compare(leftItem, rightItem) <= 0) {
      result.push(leftItem);
      leftIndex++;
    } else {
      result.push(rightItem);
      rightIndex++;
    }
  }
  
  return result.concat(left.slice(leftIndex)).concat(right.slice(rightIndex));
}