import * as Bucket from "@spica-devkit/bucket";
const APIKEY = process.env.FOOD_DELIVERY_APIKEY;

// Buckets
const DISCOUNT_BUCKET = process.env.DISCOUNTS_BUCKET;
const FOOD_BUCKET = process.env.FOODS_BUCKET;

Bucket.initialize({ apikey: APIKEY });
export async function onTick() {
  const discounts = await Bucket.data.getAll(DISCOUNT_BUCKET);
  const expireds = discounts.filter((d) => isExpired(d.until));

  const promises = [];
  for (const expired of expireds) {
    promises.push(
      Bucket.data
        .remove(DISCOUNT_BUCKET, expired._id)
        .then(() =>
          console.log(
            `Successfully deleted discound ${expired.name || expired._id}`
          )
        )
        .catch((e) =>
          console.error(
            `Failed to remove discount ${expired.name || expired._id}`
          )
        )
    );
  }

  return Promise.all(promises);
}

function isExpired(end) {
  return new Date(end).getTime() <= Date.now();
}

export async function onDiscountChange(change) {
  const target = change.kind == "delete" ? change.previous : change.current;

  const foodIds = target.foods;
  const discount = target.discount;

  if (!foodIds.length) {
    return;
  }

  const foods = await Bucket.data.getAll(FOOD_BUCKET, {
    queryParams: { filter: { _id: { $in: foodIds } } },
  });

  const promises = [];

  for (const food of foods) {
    let updatedPrice;

    if (change.kind == "delete") {
      updatedPrice = food.original_price;
    } else {
      food.original_price - (food.original_price * discount) / 100;
    }

    promises.push(
      Bucket.data.patch(FOOD_BUCKET, food._id, { current_price: updatedPrice })
    );
  }
  return Promise.all(promises);
}
