'use strict';

import * as chai from "chai";
import {ServiceInfo} from "../../../../main/dependencyManager/service/ServiceInfo";
import {Service, ServiceHelper} from "../../../../main/dependencyManager/service/Service";

const assert = chai.assert;

describe('Service', function () {

  it('should register service without parameters', async function () {
    // when
    let service: ServiceInfo = ServiceHelper.getDeclaredService(ServiceWithoutParameters);

    // then
    assert.equal(service.name, null);
    assert.equal(service.skipParentRegistration, null);
    assert.equal(service.dependencies, null);
    assert.equal(service.classz, ServiceWithoutParameters);
  });

  it('should register service with parameters', async function () {
    // given
    let service: ServiceInfo = ServiceHelper.getDeclaredService(ServiceWithParameters);

    // then
    assert.equal(service.name, 'testService');
    assert.equal(service.skipParentRegistration, true);
    assert.deepEqual(service.dependencies, ['dep1', Dep2]);
    assert.equal(service.classz, ServiceWithParameters);
  });

  it('should register service with name as parameter', async function () {
    // when
    let service: ServiceInfo = ServiceHelper.getDeclaredService(ServiceWithNameAsParameter);

    // then
    assert.equal(service.name, 'namedService');
    assert.equal(service.skipParentRegistration, null);
    assert.equal(service.dependencies, null);
    assert.equal(service.classz, ServiceWithNameAsParameter);
  });

  class Dep2 {
  }

  @Service({name: 'testService', skipParentRegistration: true, dependencies: ['dep1', Dep2]})
  class ServiceWithParameters {
  }

  @Service
  class ServiceWithoutParameters {
  }

  @Service('namedService')
  class ServiceWithNameAsParameter {
  }

});