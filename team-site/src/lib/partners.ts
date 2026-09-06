export type Partner = {
  name: string;
  alt: string;
  src: string;
  href: string;
  width: number;
  height: number;
  boxClass: string;
};

export const PARTNERS: Partner[] = [
  {
    name: "Sekolah Pilar Indonesia",
    alt: "Logo Sekolah Pilar Indonesia",
    src: "/brand/sekolah-pilar.png",
    href: "https://sekolah-pilar-indonesia.sch.id/",
    width: 400,
    height: 100,
    boxClass: "h-8 w-28 sm:h-9 sm:w-32",
  },
  {
    name: "Universitas Presiden",
    alt: "Logo Universitas Presiden",
    src: "/brand/president-university.svg",
    href: "https://president.ac.id/",
    width: 255,
    height: 48,
    boxClass: "h-8 w-36 sm:h-9 sm:w-40",
  },
  {
    name: "FabLab Jababeka",
    alt: "Logo FabLab Jababeka",
    src: "/brand/fablab.png",
    href: "https://fablabjababeka.com/",
    width: 300,
    height: 300,
    boxClass: "h-9 w-9 sm:h-10 sm:w-10",
  },
  {
    name: "Blibli",
    alt: "Logo Blibli",
    src: "/brand/blibli.png",
    href: "https://www.blibli.com/",
    width: 1000,
    height: 348,
    boxClass: "h-7 w-20 sm:h-8 sm:w-24",
  },
];
