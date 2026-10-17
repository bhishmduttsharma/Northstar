import dotenv from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const backendDir=resolve(dirname(fileURLToPath(import.meta.url)),'..');
dotenv.config({path:resolve(backendDir,'../.env')});
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import {User,Product,Sale,Movement} from './models.js';

const workspace='Acme Commerce';
const products=[
 {sku:'EL-1001',name:'Studio Headphones',category:'Electronics',purchasePrice:5200,sellingPrice:8990,stock:38,lowStockThreshold:8}, {sku:'EL-1002',name:'Mechanical Keyboard',category:'Electronics',purchasePrice:3100,sellingPrice:5490,stock:5,lowStockThreshold:12}, {sku:'EL-1003',name:'USB-C Hub Pro',category:'Electronics',purchasePrice:1900,sellingPrice:3490,stock:0,lowStockThreshold:10}, {sku:'EL-1004',name:'Portable Speaker',category:'Electronics',purchasePrice:2800,sellingPrice:4990,stock:7,lowStockThreshold:12}, {sku:'EL-1005',name:'Wireless Mouse',category:'Electronics',purchasePrice:950,sellingPrice:1790,stock:64,lowStockThreshold:15},
 {sku:'AC-2001',name:'Classic Watch',category:'Accessories',purchasePrice:4100,sellingPrice:7990,stock:23,lowStockThreshold:6}, {sku:'AC-2002',name:'Everyday Backpack',category:'Accessories',purchasePrice:2400,sellingPrice:3990,stock:17,lowStockThreshold:8}, {sku:'AC-2003',name:'Leather Wallet',category:'Accessories',purchasePrice:850,sellingPrice:1590,stock:42,lowStockThreshold:10},
 {sku:'HL-3001',name:'Ceramic Table Lamp',category:'Home & Living',purchasePrice:1800,sellingPrice:3290,stock:14,lowStockThreshold:5}, {sku:'HL-3002',name:'Linen Cushion Set',category:'Home & Living',purchasePrice:1100,sellingPrice:2190,stock:3,lowStockThreshold:8}, {sku:'AP-4001',name:'Cotton Overshirt',category:'Apparel',purchasePrice:1500,sellingPrice:2890,stock:28,lowStockThreshold:8}, {sku:'AP-4002',name:'Canvas Sneakers',category:'Apparel',purchasePrice:2600,sellingPrice:4690,stock:19,lowStockThreshold:6}
].map(p=>({...p,workspace,isActive:true}));

async function main(){
 if(!process.env.MONGODB_URI){throw new Error('MONGODB_URI is missing. Set it in the project .env before running the seed.');}
 await mongoose.connect(process.env.MONGODB_URI);
 const adminEmail=process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
 const adminPassword=process.env.SEED_ADMIN_PASSWORD;
 const staffEmail=process.env.SEED_STAFF_EMAIL?.trim().toLowerCase();
 const staffPassword=process.env.SEED_STAFF_PASSWORD;
 if(!adminEmail||!adminPassword||!staffEmail||!staffPassword){throw new Error('Set SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_STAFF_EMAIL, and SEED_STAFF_PASSWORD in .env before seeding.');}
 const accounts=[
  {name:'Jordan Davis',email:adminEmail,password:adminPassword,role:'ADMIN'},
  {name:'Alex Morgan',email:staffEmail,password:staffPassword,role:'STAFF'}
 ];
 for(const account of accounts){if(!await User.exists({email:account.email})){await User.create({...account,password:await bcrypt.hash(account.password,12),workspace});console.log(`Created ${account.role} account ${account.email}`);}else console.log(`${account.role} account already exists: ${account.email}`);}
 const admin=await User.findOne({email:accounts[0].email});
 if(await Product.exists({workspace})||await Sale.exists({workspace})){console.log('Workspace already has product or sales data; sample business data was not duplicated.');return;}
 const session=await mongoose.startSession();
 try{await session.withTransaction(async()=>{
  const inserted=await Product.insertMany(products,{session});
  await Movement.insertMany(inserted.filter(p=>p.stock>0).map(p=>({workspace,product:p._id,type:'ADJUSTMENT',quantity:p.stock,previousStock:0,newStock:p.stock,reason:'Development seed opening stock',performedBy:admin?._id})),{session});
  const bySku=new Map(inserted.map(p=>[p.sku,p]));
  const orders:{customerName:string;lines:[string,number][]}[]=[
   {customerName:'Priya Sharma',lines:[['EL-1001',2],['AC-2003',1]]},
   {customerName:'Arjun Mehta',lines:[['AC-2001',1],['EL-1005',2]]},
   {customerName:'Neha Kapoor',lines:[['AP-4001',2],['HL-3001',1],['EL-1004',1]]},
   {customerName:'Kabir Singh',lines:[['AC-2002',1],['EL-1001',1]]}
  ];
  for(let n=0;n<orders.length;n++){
   const order=orders[n],items=order.lines.map(([sku,quantity])=>{const p:any=bySku.get(sku);return {product:p._id,name:p.name,sku:p.sku,category:p.category,quantity,purchasePrice:p.purchasePrice,unitPrice:p.sellingPrice,subtotal:p.sellingPrice*quantity};});
   const subtotal=items.reduce((s,i)=>s+i.subtotal,0),discount=n===2?500:0,tax=Math.round((subtotal-discount)*0.18)/100,total=subtotal-discount+tax;
   const invoiceNumber=`INV-SEED-${String(n+1).padStart(4,'0')}`;
   const [sale]=await Sale.create([{workspace,invoiceNumber,customerName:order.customerName,items,subtotal,discount,tax,total,createdBy:admin?._id}],{session});
   for(const [sku,quantity] of order.lines){const p:any=bySku.get(sku),previousStock=p.stock;p.stock-=quantity;await p.save({session});await Movement.create([{workspace,product:p._id,type:'SALE',quantity:-quantity,previousStock,newStock:p.stock,reason:`Sale ${invoiceNumber}`,performedBy:admin?._id}],{session});}
   console.log(`Seeded sale ${sale.invoiceNumber}`);
  }
 });}finally{await session.endSession();}
 console.log(`Inserted ${products.length} development products, opening-stock movements, and 4 sales into MongoDB.`);
}main().then(()=>mongoose.disconnect()).catch(async e=>{console.error('Seed failed:',e.message);await mongoose.disconnect();process.exit(1);});
