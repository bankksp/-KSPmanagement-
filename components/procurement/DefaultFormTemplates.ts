// /components/procurement/DefaultFormTemplates.ts

export const DEFAULT_FORM_TEMPLATES: { [key: string]: string } = {
procurement_report: `
<div style="font-family: 'TH SarabunPSK', 'Sarabun', sans-serif; padding: 1.5cm 2cm; font-size: 16pt; line-height: 1.5;">
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
        <img src="https://img5.pic.in.th/file/secure-sv1/0272bb364e0dce8d02.webp" alt="ตราครุฑ" style="width: 80px; height: auto;" />
    </div>
    
    <h2 style="font-weight: bold; font-size: 24pt; text-align: center; margin-top: -1.5rem;">บันทึกข้อความ</h2>
    
    <div style="font-size: 16pt; line-height: 1.7; margin-top: 1.5rem; space-y: 0.25rem;">
        <div style="display: flex; flex-wrap: wrap;"><span style="font-weight: bold; width: 128px;">ส่วนราชการ</span> <span>{{schoolName}}</span></div>
        <div style="display: flex; flex-wrap: wrap; align-items: baseline;">
            <span style="font-weight: bold; width: 48px;">ที่</span> 
            <span style="flex-grow: 1; border-bottom: 1px dotted black; padding: 0 0.5rem;">{{docNumber}}</span> 
            <span style="font-weight: bold; width: 64px; text-align: right; padding-right: 0.5rem;">วันที่</span> 
            <span style="border-bottom: 1px dotted black; padding: 0 0.5rem; width: 192px; text-align: center;">{{docDate}}</span>
        </div>
        <div style="display: flex; flex-wrap: wrap; align-items: baseline;"><span style="font-weight: bold; width: 128px;">เรื่อง</span> <span>{{subject}}</span></div>
    </div>
    
    <hr style="border: 0; border-top: 1px solid black; margin-top: 1rem; margin-bottom: 1rem;" />

    <div style="font-size: 16pt; line-height: 1.7;">
        <p><span style="font-weight: bold;">เรียน</span> {{managerName}}</p>
        
        <p style="text-indent: 2.5cm; margin-top: 1rem; text-align: justify; line-height: 1.7;">
            ด้วย {{department}} มีความประสงค์ขออนุมัติดำเนินการจัดซื้อ
            เพื่อใช้ในการจัดการเรียนการสอน มีกำหนดใช้งานภายใน 3 วัน ตามพระราชบัญญัติการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560 มาตรา 56 วรรคหนึ่ง (2) (ข) และระเบียบกระทรวงการคลังว่าด้วยการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560 ข้อ 22 ข้อ 79 ข้อ 25 (5) และกฎกระทรวงกำหนดวงเงินการจัดซื้อจัดจ้างพัสดุโดยวิธีเฉพาะเจาะจง วงเงินการจัดซื้อจัดจ้างที่ไม่ทำข้อตกลงเป็นหนังสือ และวงเงินการจัดซื้อจัดจ้างในการแต่งตั้งผู้ตรวจรับพัสดุ พ.ศ. 2560 ข้อ 1 และข้อ 5
        </p>
        <p style="text-indent: 2.5cm; margin-top: 0.5rem;">มีรายละเอียดดังนี้</p>
    </div>

    <table style="width: 100%; border-collapse: collapse; border: 1px solid black; text-align: center; font-size: 14pt; margin-top: 1rem;">
        <thead>
            <tr style="font-weight: bold;">
                <td style="border: 1px solid black; padding: 4px; width: 5%;" rowspan="2">ลำดับที่</td>
                <td style="border: 1px solid black; padding: 4px;" rowspan="2">รายการ พัสดุ / ซื้อ / จ้าง<br/>(ขนาด ยี่ห้อและคุณลักษณะชัดเจน)</td>
                <td style="border: 1px solid black; padding: 4px;" colspan="2">ปริมาณ</td>
                <td style="border: 1px solid black; padding: 4px;" colspan="2">ราคา</td>
                <td style="border: 1px solid black; padding: 4px; width: 10%;" rowspan="2">หมายเหตุ</td>
            </tr>
            <tr style="font-weight: bold;">
                <td style="border: 1px solid black; padding: 4px; width: 8%;">จำนวน</td>
                <td style="border: 1px solid black; padding: 4px; width: 8%;">หน่วย</td>
                <td style="border: 1px solid black; padding: 4px; width: 12%;">ต่อหน่วย</td>
                <td style="border: 1px solid black; padding: 4px; width: 12%;">เป็นเงิน</td>
            </tr>
        </thead>
        <tbody>
            {{items_table_rows}}
        </tbody>
        <tfoot>
            <tr><td colspan="2" style="border: 1px solid black; padding: 4px; text-align: left; font-weight: bold;">(ส่วนลด 0.00 บาท จาก {{totalPrice}} บาท เหลือ {{totalPrice}} บาท) รวม</td><td colspan="3" style="border: 1px solid black; padding: 4px; font-weight: bold;">มูลค่าสินค้าก่อนคิด VAT</td><td style="border: 1px solid black; padding: 4px; text-align: right; font-weight: bold;">{{totalPrice}}</td><td style="border: 1px solid black; padding: 4px;"></td></tr>
            <tr><td colspan="2" style="border: 1px solid black; padding: 4px; text-align: left; font-weight: bold;"></td><td colspan="3" style="border: 1px solid black; padding: 4px; font-weight: bold;">ภาษีมูลค่าเพิ่ม 0 %</td><td style="border: 1px solid black; padding: 4px; text-align: right; font-weight: bold;">0.00</td><td style="border: 1px solid black; padding: 4px;"></td></tr>
            <tr><td colspan="2" style="border: 1px solid black; padding: 4px; text-align: center; font-weight: bold;">{{totalPriceWords}}</td><td colspan="3" style="border: 1px solid black; padding: 4px; font-weight: bold;">รวมทั้งสิ้น</td><td style="border: 1px solid black; padding: 4px; text-align: right; font-weight: bold;">{{totalPrice}}</td><td style="border: 1px solid black; padding: 4px;"></td></tr>
        </tfoot>
    </table>

    <div style="margin-top: 1rem; font-size: 16pt;">
        <p style="font-weight: bold;">จึงเรียนมาเพื่อโปรดพิจารณา</p>
        <p style="margin-left: 1rem;">1.เห็นชอบในรายงานขอซื้อ</p>
        <p style="margin-left: 1rem;">2.แต่งตั้งบุคคลต่อไปนี้ เป็นคณะกรรมการตรวจรับพัสดุ / ผู้ตรวจรับ</p>
        <div style="margin-left: 3rem; line-height: 2;">
            <div style="display: flex; align-items: baseline;"><span style="width: 32px;">2.1</span> <span style="border-bottom: 1px dotted black; flex-grow: 1;">{{committeeChairmanName}}</span> <span style="width: 80px; margin-left: 0.5rem;">ตำแหน่ง</span> <span style="border-bottom: 1px dotted black; width: 192px;">ครู</span></div>
            <div style="display: flex; align-items: baseline; "><span style="width: 32px;">2.2</span> <span style="border-bottom: 1px dotted black; flex-grow: 1;">{{committeeMember1Name}}</span> <span style="width: 80px; margin-left: 0.5rem;">ตำแหน่ง</span> <span style="border-bottom: 1px dotted black; width: 192px;">กรรมการ</span></div>
            <div style="display: flex; align-items: baseline; "><span style="width: 32px;">2.3</span> <span style="border-bottom: 1px dotted black; flex-grow: 1;">{{committeeMember2Name}}</span> <span style="width: 80px; margin-left: 0.5rem;">ตำแหน่ง</span> <span style="border-bottom: 1px dotted black; width: 192px;">กรรมการ</span></div>
        </div>
    </div>

    <div style="margin-top: 2rem; font-size: 16pt; line-height: 1.2; display: flex; justify-content: space-between;">
        <div style="width: 50%; display: flex; flex-direction: column; justify-content: space-between; text-align: center;">
            <div style="margin-bottom: 2rem;"><p>ลงชื่อ .......................................................</p><p style="margin-top: 0.5rem;">( {{requesterName}} )</p><p>เจ้าหน้าที่พัสดุ</p><p>กลุ่ม/งาน</p></div>
            <div style="margin-bottom: 2rem;"><p>ลงชื่อ .......................................................</p><p style="margin-top: 0.5rem;">( {{procurementHeadName}} )</p><p>หัวหน้าเจ้าหน้าที่พัสดุ</p><p>โรงเรียน</p></div>
            <div><p>ลงชื่อ .......................................................</p><p style="margin-top: 0.5rem;">( {{financeHeadName}} )</p><p>รองผู้อำนวยการกลุ่มบริหารงบประมาณ</p></div>
        </div>
        <div style="width: 50%; text-align: center; margin-top: 5rem;">
            <div style="margin-bottom: 2rem;"><p>1) เห็นชอบ</p><p>2) อนุมัติ</p></div>
            <div><p>ลงชื่อ........................................................</p><p style="margin-top: 0.5rem;">( {{directorName}} )</p><p>ผู้อำนวยการ{{schoolName}}</p><p>{{approvedDate}}</p></div>
        </div>
    </div>
</div>
`,
approval_memo: `
<div style="padding: 1.5cm 2cm; font-size: 16pt;">
    <!-- Your HTML content for approval_memo here -->
    <p>Approval Memo Template. Replace with actual content.</p>
</div>
`,
details_memo: `
<div style="padding: 1.5cm 2cm; font-size: 16pt;">
    <h2 style="font-weight: bold; font-size: 20pt; text-align: center;">รายละเอียดแนบท้ายรายงานขอซื้อ/ขอจ้าง</h2>
    <p style="text-align: center; font-size: 16pt;">ตามหนังสือ ที่ {{docNumber}} ลงวันที่ {{docDate}}</p>
    <table style="width: 100%; border-collapse: collapse; border: 1px solid black; text-align: center; font-size: 14pt; margin-top: 1.5rem;">
        <!-- ... table structure from component ... -->
    </table>
</div>
`,
payment_memo: `
<div style="padding: 1.5cm 2cm; font-size: 16pt;">
    <!-- Your HTML content for payment_memo here -->
    <p>Payment Memo Template. Replace with actual content.</p>
</div>
`,
disbursement_form: `
<div style="padding: 1.5cm 2cm; font-size: 16pt;">
    <!-- Your HTML content for disbursement_form here -->
    <p>Disbursement Form Template. Replace with actual content.</p>
</div>
`,
receipt_form: `
<div style="padding: 1.5cm 2cm; font-size: 16pt;">
    <!-- Your HTML content for receipt_form here -->
    <p>Receipt Form Template. Replace with actual content.</p>
</div>
`,
po_form: `
<div style="padding: 1.5cm 2cm; font-size: 16pt;">
    <!-- Your HTML content for po_form here -->
    <p>Purchase Order Template. Replace with actual content.</p>
</div>
`,
quotation_form: `
<div style="padding: 1.5cm 2cm; font-size: 16pt;">
    <!-- Your HTML content for quotation_form here -->
    <p>Quotation Form Template. Replace with actual content.</p>
</div>
`,
hiring_form: `
<div style="padding: 1.5cm 2cm; font-size: 16pt;">
    <p>Hiring Approval Form Template. This uses the same logic as the main report.</p>
    {{procurement_report}}
</div>
`,

};
