export async function fetchPositions(userAddress: string) {
  const positionsResponse = await fetch(`http://127.0.0.1:3000/positions/${userAddress}`);
  const markPricesResponse = await fetch(`http://127.0.0.1:3000/mark-prices`);

  if (!positionsResponse.ok) {
    const errorData = await positionsResponse.json();
    throw new Error(errorData.error || 'Positions API failed');
  }
  if (!markPricesResponse.ok) {
    const errorData = await markPricesResponse.json();
    throw new Error(errorData.error || 'Mark Prices API failed');
  }

  const positions = await positionsResponse.json();
  const markPrices = await markPricesResponse.json();
  return { positions, markPrices };
}
