import { HttpService } from '@nestjs/axios';
import { ProxyRequestDto } from './dto/proxy-request.dto';
export declare class CRMProxyController {
    private httpService;
    constructor(httpService: HttpService);
    proxyRequest(data: ProxyRequestDto): Promise<any>;
}
