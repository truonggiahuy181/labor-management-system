export interface IndustryCatalogDefinition {
  industryCode: string;
  industryName: string;
  parentCode: string | null;
  isActive: boolean;
}

export interface IndustrySeedRow {
  industry_code: string;
  industry_name: string;
  parent_code: string | null;
  level: number;
  is_active: boolean;
}

const industry = (
  industryCode: string,
  industryName: string,
  parentCode: string | null,
  isActive = true,
): IndustryCatalogDefinition => ({
  industryCode,
  industryName,
  parentCode,
  isActive,
});

// Cây mẫu theo cấu trúc ngành kinh tế cấp 1-4. Các mã cấp 4 đang được
// COMPANY_PROFILES sử dụng đều có đầy đủ chuỗi cha để kiểm thử nghiệp vụ cây.
export const INDUSTRY_CATALOG: readonly IndustryCatalogDefinition[] = [
  industry('A', 'Nông nghiệp, lâm nghiệp và thủy sản', null),
  industry('C', 'Công nghiệp chế biến, chế tạo', null),
  industry(
    'D',
    'Sản xuất và phân phối điện, khí đốt, nước nóng, hơi nước và điều hòa không khí',
    null,
  ),
  industry('F', 'Xây dựng', null),
  industry(
    'G',
    'Bán buôn và bán lẻ; sửa chữa ô tô, mô tô, xe máy và xe có động cơ khác',
    null,
  ),
  industry('H', 'Vận tải kho bãi', null),
  industry('I', 'Dịch vụ lưu trú và ăn uống', null),
  industry('J', 'Thông tin và truyền thông', null),
  industry('L', 'Hoạt động kinh doanh bất động sản', null),
  industry('M', 'Hoạt động chuyên môn, khoa học và công nghệ', null),
  industry('N', 'Hoạt động hành chính và dịch vụ hỗ trợ', null),
  industry('P', 'Giáo dục và đào tạo', null),
  industry('Q', 'Y tế và hoạt động trợ giúp xã hội', null),
  industry('T', 'Hoạt động làm thuê trong các hộ gia đình', null, false),

  industry('01', 'Nông nghiệp và hoạt động dịch vụ có liên quan', 'A'),
  industry('10', 'Sản xuất, chế biến thực phẩm', 'C'),
  industry('20', 'Sản xuất hóa chất và sản phẩm hóa chất', 'C'),
  industry('25', 'Sản xuất sản phẩm từ kim loại đúc sẵn', 'C'),
  industry(
    '26',
    'Sản xuất sản phẩm điện tử, máy vi tính và sản phẩm quang học',
    'C',
  ),
  industry('31', 'Sản xuất giường, tủ, bàn, ghế', 'C'),
  industry('35', 'Sản xuất và phân phối điện, khí đốt, hơi nước', 'D'),
  industry('41', 'Xây dựng nhà các loại', 'F'),
  industry('46', 'Bán buôn, trừ ô tô, mô tô, xe máy', 'G'),
  industry('47', 'Bán lẻ, trừ ô tô, mô tô, xe máy', 'G'),
  industry('49', 'Vận tải đường sắt, đường bộ và vận tải đường ống', 'H'),
  industry('56', 'Dịch vụ ăn uống', 'I'),
  industry(
    '62',
    'Lập trình, tư vấn và hoạt động liên quan đến máy vi tính',
    'J',
  ),
  industry('63', 'Hoạt động dịch vụ thông tin', 'J'),
  industry('68', 'Hoạt động kinh doanh bất động sản', 'L'),
  industry('69', 'Hoạt động pháp luật, kế toán và kiểm toán', 'M'),
  industry('70', 'Hoạt động của trụ sở văn phòng; tư vấn quản lý', 'M'),
  industry('71', 'Hoạt động kiến trúc; kiểm tra và phân tích kỹ thuật', 'M'),
  industry('73', 'Quảng cáo và nghiên cứu thị trường', 'M'),
  industry('74', 'Hoạt động chuyên môn, khoa học và công nghệ khác', 'M'),
  industry('79', 'Hoạt động du lịch', 'N'),
  industry('85', 'Giáo dục và đào tạo', 'P'),
  industry('86', 'Hoạt động y tế', 'Q'),
  industry(
    '97',
    'Hoạt động làm thuê công việc gia đình trong các hộ gia đình',
    'T',
    false,
  ),

  industry('011', 'Trồng cây hàng năm', '01'),
  industry('107', 'Sản xuất thực phẩm khác', '10'),
  industry('202', 'Sản xuất sản phẩm hóa chất khác', '20'),
  industry('259', 'Sản xuất sản phẩm khác bằng kim loại', '25'),
  industry('261', 'Sản xuất linh kiện điện tử', '26'),
  industry('310', 'Sản xuất giường, tủ, bàn, ghế', '31'),
  industry('351', 'Sản xuất, truyền tải và phân phối điện', '35'),
  industry('410', 'Xây dựng nhà các loại', '41'),
  industry('469', 'Bán buôn tổng hợp', '46'),
  industry('477', 'Bán lẻ hàng hóa khác trong các cửa hàng chuyên doanh', '47'),
  industry('493', 'Vận tải đường bộ khác', '49'),
  industry('561', 'Nhà hàng và các dịch vụ ăn uống phục vụ lưu động', '56'),
  industry(
    '620',
    'Lập trình, tư vấn và hoạt động liên quan đến máy vi tính',
    '62',
  ),
  industry('631', 'Xử lý dữ liệu, cho thuê và các hoạt động liên quan', '63'),
  industry('681', 'Kinh doanh bất động sản, quyền sử dụng đất', '68'),
  industry('691', 'Hoạt động pháp luật', '69'),
  industry('702', 'Hoạt động tư vấn quản lý', '70'),
  industry('711', 'Hoạt động kiến trúc và tư vấn kỹ thuật có liên quan', '71'),
  industry('731', 'Quảng cáo', '73'),
  industry('741', 'Hoạt động thiết kế chuyên dụng', '74'),
  industry(
    '791',
    'Hoạt động của đại lý du lịch và điều hành tua du lịch',
    '79',
  ),
  industry('855', 'Giáo dục khác', '85'),
  industry('869', 'Hoạt động y tế khác', '86'),
  industry(
    '970',
    'Hoạt động làm thuê công việc gia đình trong các hộ gia đình',
    '97',
    false,
  ),

  industry('0118', 'Trồng rau, đậu các loại và trồng hoa', '011'),
  industry('1079', 'Sản xuất thực phẩm khác chưa được phân vào đâu', '107'),
  industry('2023', 'Sản xuất mỹ phẩm, xà phòng, chất tẩy rửa, làm bóng', '202'),
  industry('2592', 'Gia công cơ khí; xử lý và tráng phủ kim loại', '259'),
  industry('2610', 'Sản xuất linh kiện điện tử', '261'),
  industry('3100', 'Sản xuất giường, tủ, bàn, ghế', '310'),
  industry('3511', 'Sản xuất điện', '351'),
  industry('4101', 'Xây dựng nhà để ở', '410'),
  industry('4690', 'Bán buôn tổng hợp', '469'),
  industry(
    '4772',
    'Bán lẻ thuốc, dụng cụ y tế, mỹ phẩm và vật phẩm vệ sinh trong các cửa hàng chuyên doanh',
    '477',
  ),
  industry('4933', 'Vận tải hàng hóa bằng đường bộ', '493'),
  industry('5610', 'Nhà hàng và các dịch vụ ăn uống phục vụ lưu động', '561'),
  industry('6201', 'Lập trình máy vi tính', '620'),
  industry(
    '6202',
    'Tư vấn máy vi tính và quản trị hệ thống máy vi tính',
    '620',
  ),
  industry('6209', 'Hoạt động dịch vụ công nghệ thông tin khác', '620'),
  industry('6311', 'Xử lý dữ liệu, cho thuê và các hoạt động liên quan', '631'),
  industry('6312', 'Cổng thông tin', '631', false),
  industry(
    '6810',
    'Kinh doanh bất động sản, quyền sử dụng đất thuộc chủ sở hữu, chủ sử dụng hoặc đi thuê',
    '681',
  ),
  industry('6910', 'Hoạt động pháp luật', '691'),
  industry('7020', 'Hoạt động tư vấn quản lý', '702'),
  industry(
    '7110',
    'Hoạt động kiến trúc và tư vấn kỹ thuật có liên quan',
    '711',
  ),
  industry('7310', 'Quảng cáo', '731'),
  industry('7410', 'Hoạt động thiết kế chuyên dụng', '741'),
  industry('7912', 'Điều hành tua du lịch', '791'),
  industry('8559', 'Giáo dục khác chưa được phân vào đâu', '855'),
  industry('8699', 'Hoạt động y tế khác chưa được phân vào đâu', '869'),
  industry(
    '9700',
    'Hoạt động làm thuê công việc gia đình trong các hộ gia đình',
    '970',
    false,
  ),
];

export function buildIndustrySeedRows(): IndustrySeedRow[] {
  const levelsByCode = new Map<string, number>();

  return INDUSTRY_CATALOG.map((item) => {
    const parentLevel =
      item.parentCode === null ? 0 : levelsByCode.get(item.parentCode);
    if (parentLevel === undefined) {
      throw new Error(
        `Industry ${item.industryCode} references unknown parent ${item.parentCode}.`,
      );
    }

    const level = parentLevel + 1;
    if (level > 4) {
      throw new Error(`Industry ${item.industryCode} exceeds level 4.`);
    }
    levelsByCode.set(item.industryCode, level);

    return {
      industry_code: item.industryCode,
      industry_name: item.industryName,
      parent_code: item.parentCode,
      level,
      is_active: item.isActive,
    };
  });
}
