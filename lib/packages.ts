export type PackageData = {
  id: string;
  name: string;
  amount: number;
  daily_earning: number;
  duration_days: number;
  total_earning: number;
  image_url: string;
  is_active: boolean;
};

export const packages: PackageData[] = [
  {
    id: "package-500",
    name: "৳500 Package",
    amount: 500,
    daily_earning: 100,
    duration_days: 30,
    total_earning: 3000,
    image_url: "/packages/package-500.png",
    is_active: true,
  },
  {
    id: "package-1000",
    name: "৳1,000 Package",
    amount: 1000,
    daily_earning: 250,
    duration_days: 30,
    total_earning: 7500,
    image_url: "/packages/package-1000.png",
    is_active: true,
  },
  {
    id: "package-1500",
    name: "৳1,500 Package",
    amount: 1500,
    daily_earning: 500,
    duration_days: 30,
    total_earning: 15000,
    image_url: "/packages/package-1500.png",
    is_active: true,
  },
  {
    id: "package-2000",
    name: "৳2,000 Package",
    amount: 2000,
    daily_earning: 400,
    duration_days: 30,
    total_earning: 12000,
    image_url: "/packages/package-2000.png",
    is_active: true,
  },
  {
    id: "package-3000",
    name: "৳3,000 Package",
    amount: 3000,
    daily_earning: 800,
    duration_days: 30,
    total_earning: 24000,
    image_url: "/packages/package-3000.png",
    is_active: true,
  },
  {
    id: "package-5000",
    name: "৳5,000 Package",
    amount: 5000,
    daily_earning: 1000,
    duration_days: 30,
    total_earning: 30000,
    image_url: "/packages/package-5000.png",
    is_active: true,
  },
  {
    id: "package-10000",
    name: "৳10,000 Package",
    amount: 10000,
    daily_earning: 2000,
    duration_days: 30,
    total_earning: 60000,
    image_url: "/packages/package-10000.png",
    is_active: true,
  },
  {
    id: "package-20000",
    name: "৳20,000 Package",
    amount: 20000,
    daily_earning: 4000,
    duration_days: 30,
    total_earning: 120000,
    image_url: "/packages/package-20000.png",
    is_active: true,
  },
  {
    id: "package-25000",
    name: "৳25,000 Package",
    amount: 25000,
    daily_earning: 5000,
    duration_days: 30,
    total_earning: 150000,
    image_url: "/packages/package-25000.png",
    is_active: true,
  },
];

export function getActivePackages(): PackageData[] {
  return packages
    .filter((pkg) => pkg.is_active)
    .sort((a, b) => a.amount - b.amount);
}

export function getPackageById(id: string): PackageData | undefined {
  return packages.find((pkg) => pkg.id === id);
}